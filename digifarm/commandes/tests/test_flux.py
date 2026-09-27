"""Test d'intégration du parcours complet : commande → paiement → séquestre →
préparation → expédition → confirmation → libération.

C'est le test qui protège la règle n°5 : l'argent n'est reversé au vendeur
qu'après confirmation de réception par l'acheteur.
"""

import json
from decimal import Decimal

import pytest
from django.urls import reverse

from annonces.models import Annonce
from commandes import services
from commandes.agregateur import signer
from commandes.models import Commande, JournalPaiement, Paiement
from core import metier

pytestmark = pytest.mark.django_db


def _commande_payee(acheteur, annonce, quantite="2") -> Commande:
    """Crée une commande et la fait passer sous séquestre via le webhook."""
    commande = services.creer_commande(
        acheteur=acheteur,
        annonce=annonce,
        quantite=Decimal(quantite),
        mode_livraison="retrait",
    )
    services.traiter_evenement_paiement(
        ref=str(commande.paiement.ref_agregateur),
        montant=commande.total,
        statut="success",
        methode="flooz",
    )
    commande.refresh_from_db()
    return commande


# --- parcours nominal ---------------------------------------------------------


def test_parcours_complet_jusqua_la_liberation(acheteur, vendeur, annonce):
    commande = _commande_payee(acheteur, annonce)

    # Après paiement : commande payée, fonds sous séquestre.
    assert commande.statut == metier.CMD_PAYEE
    assert commande.paiement.statut_sequestre == metier.SEQ_SEQUESTRE
    assert commande.total == 30000  # 15 000 × 2
    assert commande.paiement.frais_commission == 1500  # 5 %

    # Le vendeur prépare puis expédie.
    assert services.avancer_statut(
        commande_id=commande.pk, vendeur=vendeur, vers=metier.CMD_PREPAREE
    ).ok
    assert services.avancer_statut(
        commande_id=commande.pk, vendeur=vendeur, vers=metier.CMD_EXPEDIEE
    ).ok

    # Tant que l'acheteur n'a pas confirmé, l'argent ne bouge pas.
    commande.refresh_from_db()
    assert commande.paiement.statut_sequestre == metier.SEQ_SEQUESTRE

    # Confirmation de réception → libération.
    resultat = services.liberer_sur_reception(
        commande_id=commande.pk, acheteur=acheteur
    )
    assert resultat.ok

    commande.refresh_from_db()
    assert commande.statut == metier.CMD_LIVREE
    assert commande.paiement.statut_sequestre == metier.SEQ_LIBERE

    # Le vendeur touche le net : 30 000 − 1 500 = 28 500.
    derniere = JournalPaiement.objects.filter(paiement=commande.paiement).last()
    assert derniere.statut_arrivee == metier.SEQ_LIBERE
    assert derniere.montant == 28500
    assert derniere.acteur == "acheteur"


def test_le_stock_diminue_au_paiement_seulement(acheteur, annonce):
    stock_initial = annonce.quantite_dispo

    # Commande créée mais pas payée : le stock ne bouge pas.
    commande = services.creer_commande(
        acheteur=acheteur,
        annonce=annonce,
        quantite=Decimal("3"),
        mode_livraison="retrait",
    )
    annonce.refresh_from_db()
    assert annonce.quantite_dispo == stock_initial

    # Après encaissement, le stock est décrémenté.
    services.traiter_evenement_paiement(
        ref=str(commande.paiement.ref_agregateur),
        montant=commande.total,
        statut="success",
    )
    annonce.refresh_from_db()
    assert annonce.quantite_dispo == stock_initial - 3


def test_annonce_epuisee_quand_le_stock_tombe_a_zero(acheteur, vendeur):
    annonce = Annonce.objects.create(
        agriculteur=vendeur,
        titre="Dernier sac de riz",
        categorie="Céréales",
        description="Fin de récolte.",
        prix=10000,
        unite="sac",
        quantite_dispo=Decimal("2"),
        region="Maritime",
    )
    commande = _commande_payee(acheteur, annonce, quantite="2")
    annonce.refresh_from_db()
    assert annonce.quantite_dispo == 0
    assert annonce.statut == metier.STATUT_EPUISEE
    assert commande.statut == metier.CMD_PAYEE


# --- garde-fous sur l'argent --------------------------------------------------


def test_le_litige_bloque_la_liberation(acheteur, annonce):
    commande = _commande_payee(acheteur, annonce)
    assert services.ouvrir_litige(
        commande_id=commande.pk, acteur=acheteur, motif="Sacs abîmés."
    ).ok

    resultat = services.liberer_sur_reception(
        commande_id=commande.pk, acheteur=acheteur
    )
    assert not resultat.ok
    assert "litige" in resultat.message.lower()

    commande.refresh_from_db()
    assert commande.paiement.statut_sequestre == metier.SEQ_SEQUESTRE


def test_double_confirmation_ne_paie_pas_deux_fois(acheteur, annonce):
    commande = _commande_payee(acheteur, annonce)
    assert services.liberer_sur_reception(
        commande_id=commande.pk, acheteur=acheteur
    ).ok

    seconde = services.liberer_sur_reception(commande_id=commande.pk, acheteur=acheteur)
    assert not seconde.ok
    # Une seule libération dans le journal.
    assert (
        JournalPaiement.objects.filter(
            paiement=commande.paiement, statut_arrivee=metier.SEQ_LIBERE
        ).count()
        == 1
    )


def test_un_tiers_ne_libere_pas_le_paiement(acheteur, autre_acheteur, annonce):
    commande = _commande_payee(acheteur, annonce)
    resultat = services.liberer_sur_reception(
        commande_id=commande.pk, acheteur=autre_acheteur
    )
    assert not resultat.ok
    commande.refresh_from_db()
    assert commande.paiement.statut_sequestre == metier.SEQ_SEQUESTRE


def test_un_autre_vendeur_ne_fait_pas_avancer_la_commande(
    acheteur, autre_vendeur, annonce
):
    commande = _commande_payee(acheteur, annonce)
    resultat = services.avancer_statut(
        commande_id=commande.pk, vendeur=autre_vendeur, vers=metier.CMD_PREPAREE
    )
    assert not resultat.ok
    commande.refresh_from_db()
    assert commande.statut == metier.CMD_PAYEE


def test_le_vendeur_ne_peut_pas_declarer_la_commande_livree(
    acheteur, vendeur, annonce
):
    """Seul l'acheteur déclenche la livraison — sinon le vendeur se paierait
    lui-même."""
    commande = _commande_payee(acheteur, annonce)
    resultat = services.avancer_statut(
        commande_id=commande.pk, vendeur=vendeur, vers=metier.CMD_LIVREE
    )
    assert not resultat.ok
    commande.refresh_from_db()
    assert commande.paiement.statut_sequestre == metier.SEQ_SEQUESTRE


# --- création de commande -----------------------------------------------------


def test_impossible_dacheter_sa_propre_annonce(vendeur, annonce):
    with pytest.raises(services.CommandeImpossible):
        services.creer_commande(
            acheteur=vendeur,
            annonce=annonce,
            quantite=Decimal("1"),
            mode_livraison="retrait",
        )


def test_impossible_de_commander_plus_que_le_stock(acheteur, annonce):
    with pytest.raises(services.CommandeImpossible):
        services.creer_commande(
            acheteur=acheteur,
            annonce=annonce,
            quantite=annonce.quantite_dispo + 1,
            mode_livraison="retrait",
        )


def test_le_total_est_recalcule_cote_serveur(acheteur, annonce):
    """Le client n'envoie qu'une quantité ; le prix vient de la base."""
    commande = services.creer_commande(
        acheteur=acheteur,
        annonce=annonce,
        quantite=Decimal("2.5"),
        mode_livraison="retrait",
    )
    assert commande.total == 37500  # 15 000 × 2,5
    assert commande.lignes.first().prix_unitaire == annonce.prix


# --- webhook ------------------------------------------------------------------


def _appeler_webhook(client, charge: dict, signature: str | None = None):
    corps = json.dumps(charge, separators=(",", ":"), sort_keys=True)
    return client.post(
        reverse("commandes:webhook"),
        data=corps,
        content_type="application/json",
        headers={"X-Digifarm-Signature": signature if signature is not None else signer(charge)},
    )


def test_webhook_refuse_une_signature_invalide(client, acheteur, annonce):
    commande = services.creer_commande(
        acheteur=acheteur,
        annonce=annonce,
        quantite=Decimal("1"),
        mode_livraison="retrait",
    )
    charge = {
        "ref": str(commande.paiement.ref_agregateur),
        "montant": commande.total,
        "statut": "success",
    }
    reponse = _appeler_webhook(client, charge, signature="n-importe-quoi")
    assert reponse.status_code == 401

    commande.refresh_from_db()
    assert commande.paiement.statut_sequestre == metier.SEQ_ATTENTE


def test_webhook_refuse_un_montant_incoherent(client, acheteur, annonce):
    """La tentative la plus évidente : payer 100 FCFA une commande de 15 000."""
    commande = services.creer_commande(
        acheteur=acheteur,
        annonce=annonce,
        quantite=Decimal("1"),
        mode_livraison="retrait",
    )
    charge = {
        "ref": str(commande.paiement.ref_agregateur),
        "montant": 100,
        "statut": "success",
    }
    reponse = _appeler_webhook(client, charge)
    assert reponse.status_code == 400

    commande.refresh_from_db()
    assert commande.paiement.statut_sequestre == metier.SEQ_ATTENTE


def test_webhook_est_idempotent(client, acheteur, annonce):
    commande = services.creer_commande(
        acheteur=acheteur,
        annonce=annonce,
        quantite=Decimal("1"),
        mode_livraison="retrait",
    )
    charge = {
        "ref": str(commande.paiement.ref_agregateur),
        "montant": commande.total,
        "statut": "success",
    }

    assert _appeler_webhook(client, charge).status_code == 200
    assert _appeler_webhook(client, charge).status_code == 200

    # Le stock n'a été décrémenté qu'une fois.
    annonce.refresh_from_db()
    assert annonce.quantite_dispo == 39
    # Et le journal ne contient qu'un seul passage sous séquestre.
    assert (
        JournalPaiement.objects.filter(
            paiement=commande.paiement, statut_arrivee=metier.SEQ_SEQUESTRE
        ).count()
        == 1
    )


def test_webhook_ignore_un_paiement_echoue(client, acheteur, annonce):
    commande = services.creer_commande(
        acheteur=acheteur,
        annonce=annonce,
        quantite=Decimal("1"),
        mode_livraison="retrait",
    )
    charge = {
        "ref": str(commande.paiement.ref_agregateur),
        "montant": commande.total,
        "statut": "failed",
    }
    reponse = _appeler_webhook(client, charge)
    assert reponse.status_code == 200

    commande.refresh_from_db()
    assert commande.statut == metier.CMD_ATTENTE_PAIEMENT
    assert commande.paiement.statut_sequestre == metier.SEQ_ATTENTE


def test_webhook_sur_reference_inconnue(client):
    charge = {
        "ref": "00000000-0000-0000-0000-000000000000",
        "montant": 1000,
        "statut": "success",
    }
    assert _appeler_webhook(client, charge).status_code == 404


def test_aucun_paiement_ne_reste_orphelin(acheteur, annonce):
    """Chaque commande a exactement un paiement, créé dans la même transaction."""
    services.creer_commande(
        acheteur=acheteur,
        annonce=annonce,
        quantite=Decimal("1"),
        mode_livraison="retrait",
    )
    assert Paiement.objects.count() == Commande.objects.count() == 1
