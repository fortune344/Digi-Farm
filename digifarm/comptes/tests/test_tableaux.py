"""Tableaux de bord : ce qu'ils affichent, et à qui.

L'ancienne version montrait une liste plate sans chiffres ni action. Ces tests
verrouillent ce qui doit y figurer : l'argent, la file d'action, et le bouton
qui fait avancer la commande sans quitter la page.
"""

from decimal import Decimal

import pytest
from django.urls import reverse

from commandes import services
from core import metier

pytestmark = pytest.mark.django_db


def _commande_payee(acheteur, annonce, quantite="2"):
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
    )
    commande.refresh_from_db()
    return commande


# --- aiguillage par rôle ------------------------------------------------------


def test_le_vendeur_voit_le_tableau_vendeur(connexion, vendeur):
    reponse = connexion(vendeur).get(reverse("comptes:tableau_de_bord"))
    assert reponse.status_code == 200
    assert "comptes/tableau_vendeur.html" in [t.name for t in reponse.templates]


def test_lacheteur_voit_le_tableau_acheteur(connexion, acheteur):
    reponse = connexion(acheteur).get(reverse("comptes:tableau_de_bord"))
    assert reponse.status_code == 200
    assert "comptes/tableau_acheteur.html" in [t.name for t in reponse.templates]


# --- contenu du tableau vendeur -----------------------------------------------


def test_le_vendeur_voit_ses_annonces_et_son_stock(connexion, vendeur, annonce):
    reponse = connexion(vendeur).get(reverse("comptes:tableau_de_bord"))
    contenu = reponse.content.decode()
    assert annonce.titre in contenu
    assert reponse.context["nb_annonces"] == 1
    assert reponse.context["nb_actives"] == 1


def test_les_tuiles_comptent_les_commandes_a_traiter(
    connexion, vendeur, acheteur, annonce
):
    _commande_payee(acheteur, annonce)
    reponse = connexion(vendeur).get(reverse("comptes:tableau_de_bord"))
    assert reponse.context["nb_a_traiter"] == 1


def test_la_tuile_sequestre_affiche_le_net_vendeur(
    connexion, vendeur, acheteur, annonce
):
    """15 000 × 2 = 30 000, moins 5 % de commission = 28 500 pour le vendeur."""
    _commande_payee(acheteur, annonce)
    reponse = connexion(vendeur).get(reverse("comptes:tableau_de_bord"))
    assert reponse.context["sous_sequestre"] == 28500
    assert reponse.context["encaisse"] == 0


def test_la_tuile_encaisse_bouge_apres_confirmation(
    connexion, vendeur, acheteur, annonce
):
    commande = _commande_payee(acheteur, annonce)
    services.liberer_sur_reception(commande_id=commande.pk, acheteur=acheteur)

    reponse = connexion(vendeur).get(reverse("comptes:tableau_de_bord"))
    assert reponse.context["sous_sequestre"] == 0
    assert reponse.context["encaisse"] == 28500
    assert reponse.context["nb_ventes_livrees"] == 1


def test_le_bouton_daction_est_dans_la_file(connexion, vendeur, acheteur, annonce):
    """Le vendeur doit pouvoir préparer sans ouvrir la commande."""
    commande = _commande_payee(acheteur, annonce)
    reponse = connexion(vendeur).get(reverse("comptes:tableau_de_bord"))
    contenu = reponse.content.decode()
    assert reverse("commandes:preparer", args=[commande.pk]) in contenu
    assert "Marquer préparée" in contenu


def test_le_bouton_devient_expedier_apres_preparation(
    connexion, vendeur, acheteur, annonce
):
    commande = _commande_payee(acheteur, annonce)
    services.avancer_statut(
        commande_id=commande.pk, vendeur=vendeur, vers=metier.CMD_PREPAREE
    )
    reponse = connexion(vendeur).get(reverse("comptes:tableau_de_bord"))
    contenu = reponse.content.decode()
    assert reverse("commandes:expedier", args=[commande.pk]) in contenu
    assert "Marquer expédiée" in contenu


def test_les_litiges_sont_signales_en_haut(connexion, vendeur, acheteur, annonce):
    commande = _commande_payee(acheteur, annonce)
    services.ouvrir_litige(
        commande_id=commande.pk, acteur=acheteur, motif="Sacs abîmés."
    )
    reponse = connexion(vendeur).get(reverse("comptes:tableau_de_bord"))
    assert len(reponse.context["litiges"]) == 1
    assert "en litige" in reponse.content.decode()
    # Une commande en litige ne réclame plus d'action de préparation.
    assert reponse.context["nb_a_traiter"] == 0


def test_un_vendeur_ne_voit_pas_les_commandes_dun_autre(
    connexion, autre_vendeur, acheteur, annonce
):
    _commande_payee(acheteur, annonce)  # appartient à `vendeur`, pas à `autre_vendeur`
    reponse = connexion(autre_vendeur).get(reverse("comptes:tableau_de_bord"))
    assert reponse.context["nb_a_traiter"] == 0
    assert reponse.context["sous_sequestre"] == 0


def test_etat_vide_guide_vers_la_premiere_annonce(connexion, vendeur):
    reponse = connexion(vendeur).get(reverse("comptes:tableau_de_bord"))
    contenu = reponse.content.decode()
    assert "Publiez votre première annonce" in contenu
    assert reverse("annonces:nouvelle") in contenu


# --- contenu du tableau acheteur ----------------------------------------------


def test_lacheteur_voit_ce_quil_doit_confirmer(connexion, vendeur, acheteur, annonce):
    commande = _commande_payee(acheteur, annonce)
    services.avancer_statut(
        commande_id=commande.pk, vendeur=vendeur, vers=metier.CMD_PREPAREE
    )
    services.avancer_statut(
        commande_id=commande.pk, vendeur=vendeur, vers=metier.CMD_EXPEDIEE
    )

    reponse = connexion(acheteur).get(reverse("comptes:tableau_de_bord"))
    assert len(reponse.context["a_confirmer"]) == 1
    contenu = reponse.content.decode()
    assert reverse("commandes:confirmer", args=[commande.pk]) in contenu


def test_lacheteur_voit_le_montant_protege(connexion, acheteur, annonce):
    """Ce que l'acheteur a payé et qui n'est pas encore parti chez le vendeur."""
    _commande_payee(acheteur, annonce)
    reponse = connexion(acheteur).get(reverse("comptes:tableau_de_bord"))
    assert reponse.context["protege"] == 30000


def test_un_acheteur_ne_voit_pas_les_commandes_dun_autre(
    connexion, autre_acheteur, acheteur, annonce
):
    _commande_payee(acheteur, annonce)
    reponse = connexion(autre_acheteur).get(reverse("comptes:tableau_de_bord"))
    assert reponse.context["nb_commandes"] == 0
    assert reponse.context["protege"] == 0
