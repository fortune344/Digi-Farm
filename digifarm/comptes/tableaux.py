"""Tableaux de bord, par rôle.

Vue transversale : elle croise les annonces, les commandes et l'argent, d'où sa
place ici plutôt que dans une seule app.

Principe de conception — l'ancienne version se contentait d'empiler « bonjour »,
une liste plate de commandes, puis une grille d'annonces. On y voyait quoi, mais
pas quoi FAIRE, ni combien on avait gagné. Ici :

    1. l'argent d'abord  — sous séquestre, déjà encaissé, ce qui arrive ;
    2. la file d'action  — les commandes qui attendent le vendeur, avec le
                           bouton qui les fait avancer directement ;
    3. l'inventaire      — les annonces, avec les alertes de stock ;
    4. l'historique      — le reste, replié en bas.
"""

from django.db.models import Count, DecimalField, F, Q, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import render

from annonces.models import Annonce
from commandes.models import Commande, Paiement
from core import metier


def _somme_nette(requete) -> int:
    """Somme des montants NETS vendeur (total − commission) d'un jeu de paiements.

    On affiche au vendeur ce qu'il touche réellement, pas le montant brut payé
    par l'acheteur : la commission de 5 % est déjà déduite.
    """
    agregat = requete.aggregate(
        total=Coalesce(
            Sum(F("montant") - F("frais_commission")),
            0,
            output_field=DecimalField(max_digits=14, decimal_places=0),
        )
    )
    return int(agregat["total"])


def vue_vendeur(request, profil):
    """Tableau de bord de l'agriculteur."""
    utilisateur = request.user

    # --- Annonces ---
    annonces = list(
        Annonce.objects.de(utilisateur).prefetch_related("photos").order_by("-cree_le")
    )
    nb_actives = sum(1 for a in annonces if a.statut == metier.STATUT_ACTIVE)
    nb_epuisees = sum(1 for a in annonces if a.est_epuisee)
    nb_suspendues = sum(1 for a in annonces if a.statut == metier.STATUT_SUSPENDUE)

    # --- Commandes (le panier abandonné ne compte pas) ---
    commandes = (
        Commande.objects.de_lagriculteur(utilisateur)
        .payees()
        .avec_details()
        .prefetch_related("lignes")
    )

    a_traiter, en_cours, terminees, litiges = [], [], [], []
    for commande in commandes:
        if commande.statut == metier.CMD_LITIGE:
            litiges.append(commande)
        elif commande.statut in (metier.CMD_PAYEE, metier.CMD_PREPAREE):
            a_traiter.append(commande)
        elif commande.statut == metier.CMD_EXPEDIEE:
            en_cours.append(commande)
        else:
            terminees.append(commande)

    # --- Argent ---
    paiements = Paiement.objects.filter(commande__agriculteur=utilisateur)
    sous_sequestre = _somme_nette(
        paiements.filter(statut_sequestre=metier.SEQ_SEQUESTRE)
    )
    encaisse = _somme_nette(paiements.filter(statut_sequestre=metier.SEQ_LIBERE))

    # Nombre de commandes dont l'argent attend la confirmation de réception.
    nb_en_attente_reception = paiements.filter(
        statut_sequestre=metier.SEQ_SEQUESTRE
    ).count()

    return render(
        request,
        "comptes/tableau_vendeur.html",
        {
            "profil_utilisateur": profil,
            # tuiles
            "nb_a_traiter": len(a_traiter),
            "sous_sequestre": sous_sequestre,
            "nb_en_attente_reception": nb_en_attente_reception,
            "encaisse": encaisse,
            "nb_ventes_livrees": len(terminees),
            "nb_annonces": len(annonces),
            "nb_actives": nb_actives,
            "nb_epuisees": nb_epuisees,
            "nb_suspendues": nb_suspendues,
            # listes
            "a_traiter": a_traiter,
            "en_cours": en_cours,
            "terminees": terminees[:10],
            "litiges": litiges,
            "annonces": annonces,
        },
    )


def vue_acheteur(request, profil):
    """Tableau de bord de l'acheteur : ses commandes et ce qu'il doit confirmer."""
    utilisateur = request.user

    commandes = (
        Commande.objects.de_lacheteur(utilisateur)
        .avec_details()
        .prefetch_related("lignes")
    )

    a_confirmer, en_cours, terminees, a_payer = [], [], [], []
    for commande in commandes:
        paiement = getattr(commande, "paiement", None)
        if commande.statut == metier.CMD_ATTENTE_PAIEMENT:
            a_payer.append(commande)
        elif commande.statut in (metier.CMD_LIVREE, metier.CMD_ANNULEE):
            terminees.append(commande)
        elif paiement is not None and paiement.est_sous_sequestre and (
            commande.statut == metier.CMD_EXPEDIEE
        ):
            # Expédiée et payée : c'est à l'acheteur de confirmer la réception.
            a_confirmer.append(commande)
        else:
            en_cours.append(commande)

    # Ce que l'acheteur a déjà engagé et qui n'est pas encore libéré : son argent
    # est protégé, il est utile de le lui dire explicitement.
    protege = Paiement.objects.filter(
        commande__acheteur=utilisateur, statut_sequestre=metier.SEQ_SEQUESTRE
    ).aggregate(total=Coalesce(Sum("montant"), 0))["total"]

    total_depense = Paiement.objects.filter(
        commande__acheteur=utilisateur, statut_sequestre=metier.SEQ_LIBERE
    ).aggregate(total=Coalesce(Sum("montant"), 0))["total"]

    suggestions = (
        Annonce.objects.publiables()
        .select_related("agriculteur__profil")
        .prefetch_related("photos")
        .exclude(agriculteur=utilisateur)[:3]
    )

    return render(
        request,
        "comptes/tableau_acheteur.html",
        {
            "profil_utilisateur": profil,
            "a_confirmer": a_confirmer,
            "en_cours": en_cours,
            "a_payer": a_payer,
            "terminees": terminees[:10],
            "nb_commandes": len(commandes),
            "protege": int(protege),
            "total_depense": int(total_depense),
            "suggestions": suggestions,
        },
    )
