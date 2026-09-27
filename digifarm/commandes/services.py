"""Services de commande et de paiement — toute l'écriture passe par ici.

Aucune vue ne modifie directement un statut ou un montant : elle appelle un
service, qui vérifie l'autorisation, la transition d'état, et journalise.
C'est ce qui garantit que l'argent ne bouge jamais sans trace (règle n°5).

Port de src/lib/orders/queries.ts.
"""

from dataclasses import dataclass
from decimal import Decimal

from django.db import transaction
from django.db.models import F

from annonces.models import Annonce
from core import metier

from . import sequestre
from .agregateur import DemandeReversement, agregateur_courant
from .liberation import planifier_liberation
from .models import Commande, JournalPaiement, LigneCommande, Paiement
from .statuts import peut_changer_statut, peut_ouvrir_litige
from .tarifs import calculer_commission, calculer_total


@dataclass(frozen=True)
class Resultat:
    """Réponse d'un service : succès ou échec, avec un message affichable."""

    ok: bool
    message: str = ""


def journaliser(
    paiement: Paiement,
    depart: str | None,
    arrivee: str,
    acteur: str,
    montant: int,
    note: str = "",
) -> None:
    """Écrit une ligne dans la piste d'audit. Jamais effacée, jamais modifiée."""
    JournalPaiement.objects.create(
        paiement=paiement,
        statut_depart=depart or "",
        statut_arrivee=arrivee,
        acteur=acteur,
        montant=montant,
        note=note[:255],
    )


# --- Création de la commande (tunnel d'achat) --------------------------------


class CommandeImpossible(Exception):
    """La commande ne peut pas être créée (stock, auto-achat, quantité…)."""


@transaction.atomic
def creer_commande(
    *,
    acheteur,
    annonce: Annonce,
    quantite: Decimal,
    mode_livraison: str,
    adresse: str = "",
) -> Commande:
    """Crée commande + ligne + paiement en attente, en une seule transaction.

    Le total est TOUJOURS recalculé ici depuis le prix en base : un total envoyé
    par le client n'est jamais utilisé (règle n°9).
    """
    if annonce.agriculteur_id == acheteur.pk:
        raise CommandeImpossible("Vous ne pouvez pas acheter votre propre annonce.")
    if not annonce.est_disponible:
        raise CommandeImpossible("Cette annonce n'est plus disponible.")
    if quantite <= 0:
        raise CommandeImpossible("La quantité doit être supérieure à zéro.")
    if quantite > annonce.quantite_dispo:
        raise CommandeImpossible(
            f"Stock insuffisant : il reste {annonce.quantite_dispo} {annonce.unite}."
        )

    total = calculer_total(annonce.prix, quantite)
    commission = calculer_commission(total)

    commande = Commande.objects.create(
        acheteur=acheteur,
        agriculteur_id=annonce.agriculteur_id,
        total=total,
        mode_livraison=mode_livraison,
        adresse_livraison=adresse,
    )
    LigneCommande.objects.create(
        commande=commande,
        annonce=annonce,
        titre=annonce.titre,
        prix_unitaire=annonce.prix,
        quantite=quantite,
    )
    paiement = Paiement.objects.create(
        commande=commande, montant=total, frais_commission=commission
    )
    journaliser(paiement, None, metier.SEQ_ATTENTE, "system", total, "Commande créée")
    return commande


# --- Encaissement : webhook de l'agrégateur ----------------------------------


@dataclass(frozen=True)
class ResultatWebhook:
    ok: bool
    code: int
    message: str


@transaction.atomic
def traiter_evenement_paiement(
    *, ref: str, montant: int, statut: str, methode: str = ""
) -> ResultatWebhook:
    """Traite un événement de paiement reçu du webhook signé.

    Idempotent (un même événement reçu deux fois ne paie pas deux fois),
    vérifie le montant, journalise chaque transition.
    NE LIBÈRE JAMAIS les fonds : s'arrête à « sous séquestre ».
    """
    paiement = (
        Paiement.objects.select_for_update()
        .filter(ref_agregateur=ref)
        .select_related("commande")
        .first()
    )
    if paiement is None:
        return ResultatWebhook(False, 404, "paiement introuvable")

    if statut != "success":
        return ResultatWebhook(True, 200, "paiement non réussi, ignoré")

    # Idempotence : si l'argent a déjà bougé, on ne rejoue pas l'événement.
    if paiement.statut_sequestre != metier.SEQ_ATTENTE:
        return ResultatWebhook(True, 200, "déjà traité (idempotent)")

    if int(montant) != paiement.montant:
        return ResultatWebhook(False, 400, "montant incohérent")

    # Transitions vérifiées : lèvent si le chemin n'est pas autorisé.
    sequestre.verifier_transition(metier.SEQ_ATTENTE, metier.SEQ_COLLECTE)
    sequestre.verifier_transition(metier.SEQ_COLLECTE, metier.SEQ_SEQUESTRE)

    methodes_connues = dict(metier.METHODES_PAIEMENT)
    paiement.methode = methode if methode in methodes_connues else ""
    paiement.statut_sequestre = metier.SEQ_SEQUESTRE
    paiement.save(update_fields=["methode", "statut_sequestre", "modifie_le"])

    journaliser(
        paiement, metier.SEQ_ATTENTE, metier.SEQ_COLLECTE, "webhook", paiement.montant,
        "PayIn confirmé",
    )
    journaliser(
        paiement, metier.SEQ_COLLECTE, metier.SEQ_SEQUESTRE, "system", paiement.montant,
        "Fonds sous séquestre",
    )

    commande = paiement.commande
    commande.statut = metier.CMD_PAYEE
    commande.save(update_fields=["statut", "modifie_le"])

    # Le stock ne se décrémente qu'une fois l'argent réellement encaissé.
    for ligne in commande.lignes.all():
        if ligne.annonce_id:
            Annonce.objects.filter(pk=ligne.annonce_id).update(
                quantite_dispo=F("quantite_dispo") - ligne.quantite
            )
            annonce = Annonce.objects.get(pk=ligne.annonce_id)
            if annonce.quantite_dispo <= 0:
                Annonce.objects.filter(pk=annonce.pk).update(
                    statut=metier.STATUT_EPUISEE
                )

    return ResultatWebhook(True, 200, "séquestré")


# --- Suivi par l'agriculteur --------------------------------------------------


@transaction.atomic
def avancer_statut(*, commande_id, vendeur, vers: str) -> Resultat:
    """L'agriculteur fait avancer SA commande (payée → préparée → expédiée)."""
    commande = Commande.objects.select_for_update().filter(pk=commande_id).first()
    if commande is None:
        return Resultat(False, "Commande introuvable.")
    if commande.agriculteur_id != vendeur.pk:
        return Resultat(False, "Action non autorisée.")
    if vers not in (metier.CMD_PREPAREE, metier.CMD_EXPEDIEE):
        # Le vendeur ne décide ni de la livraison ni de l'annulation.
        return Resultat(False, "Action non autorisée.")
    if not peut_changer_statut(commande.statut, vers):
        return Resultat(False, "Cette action n'est pas possible maintenant.")

    commande.statut = vers
    commande.save(update_fields=["statut", "modifie_le"])
    libelles = dict(metier.STATUTS_COMMANDE)
    return Resultat(True, f"Commande marquée « {libelles[vers].lower()} ».")


# --- Confirmation de réception → libération du séquestre ---------------------


@transaction.atomic
def liberer_sur_reception(*, commande_id, acheteur) -> Resultat:
    """Confirmation de réception par l'acheteur → PayOut net vers l'agriculteur.

    C'est le SEUL chemin qui libère les fonds. Bloqué en cas de litige.
    Idempotent : une seconde confirmation ne repaie pas.
    """
    commande = (
        Commande.objects.select_for_update()
        .filter(pk=commande_id)
        .select_related("paiement")
        .first()
    )
    if commande is None:
        return Resultat(False, "Commande introuvable.")
    if commande.acheteur_id != acheteur.pk:
        return Resultat(False, "Action non autorisée.")

    paiement = getattr(commande, "paiement", None)
    if paiement is None:
        return Resultat(False, "Aucun paiement rattaché à cette commande.")

    decision = planifier_liberation(commande.statut, paiement)
    if not decision.ok:
        return Resultat(False, decision.raison)

    # Reversement effectif (ici simulé) vers l'agriculteur.
    reversement = agregateur_courant().reverser(
        DemandeReversement(
            ref=str(paiement.ref_agregateur),
            montant=decision.net,
            commande_id=str(commande.pk),
        )
    )
    if not reversement.ok:
        return Resultat(False, "Le reversement a échoué, réessayez.")

    sequestre.verifier_transition(metier.SEQ_SEQUESTRE, metier.SEQ_LIBERE)
    paiement.statut_sequestre = metier.SEQ_LIBERE
    paiement.save(update_fields=["statut_sequestre", "modifie_le"])
    journaliser(
        paiement,
        metier.SEQ_SEQUESTRE,
        metier.SEQ_LIBERE,
        "acheteur",
        decision.net,
        f"Réception confirmée — PayOut {reversement.ref_reversement}".strip(),
    )

    commande.statut = metier.CMD_LIVREE
    commande.save(update_fields=["statut", "modifie_le"])
    return Resultat(True, "Réception confirmée. Le vendeur a été payé.")


# --- Litige -------------------------------------------------------------------


@transaction.atomic
def ouvrir_litige(*, commande_id, acteur, motif: str) -> Resultat:
    """Ouvre un litige (acheteur ou vendeur) : bloque la libération du séquestre."""
    commande = Commande.objects.select_for_update().filter(pk=commande_id).first()
    if commande is None:
        return Resultat(False, "Commande introuvable.")
    if acteur.pk not in (commande.acheteur_id, commande.agriculteur_id):
        return Resultat(False, "Action non autorisée.")
    if not peut_ouvrir_litige(commande.statut):
        return Resultat(False, "Impossible d'ouvrir un litige à ce stade.")
    if not motif.strip():
        return Resultat(False, "Décrivez le problème pour ouvrir un litige.")

    commande.statut = metier.CMD_LITIGE
    commande.litige_motif = motif.strip()
    commande.save(update_fields=["statut", "litige_motif", "modifie_le"])
    return Resultat(True, "Litige ouvert. Un administrateur va l'examiner.")
