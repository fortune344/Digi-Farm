"""Chaque page se rend sans erreur de gabarit.

Un test « bête » mais utile : une balise mal fermée ou une icône inexistante ne
se voit pas à la relecture, et casse la page en production.
"""

from decimal import Decimal

import pytest
from django.urls import reverse

from commandes import services
from core import metier

pytestmark = pytest.mark.django_db


# --- pages publiques ----------------------------------------------------------


def test_accueil(client, annonce):
    reponse = client.get(reverse("annonces:accueil"))
    assert reponse.status_code == 200
    assert annonce.titre in reponse.content.decode()


def test_marche(client, annonce):
    reponse = client.get(reverse("annonces:marche"))
    assert reponse.status_code == 200
    assert annonce.titre in reponse.content.decode()


def test_detail_annonce(client, annonce):
    reponse = client.get(reverse("annonces:detail", args=[annonce.pk]))
    assert reponse.status_code == 200


def test_connexion_et_inscription(client):
    assert client.get(reverse("comptes:connexion")).status_code == 200
    assert client.get(reverse("comptes:inscription")).status_code == 200


# --- filtres du marché --------------------------------------------------------


def test_recherche_par_mot_cle(client, annonce):
    reponse = client.get(reverse("annonces:marche"), {"q": "maïs"})
    assert annonce.titre in reponse.content.decode()

    reponse = client.get(reverse("annonces:marche"), {"q": "tomate"})
    assert annonce.titre not in reponse.content.decode()


def test_filtre_par_categorie(client, annonce):
    reponse = client.get(reverse("annonces:marche"), {"categorie": "Céréales"})
    assert annonce.titre in reponse.content.decode()

    reponse = client.get(reverse("annonces:marche"), {"categorie": "Fruits"})
    assert annonce.titre not in reponse.content.decode()


def test_un_filtre_fantaisiste_est_ignore(client, annonce):
    """Un paramètre inventé ne doit ni planter ni filtrer au hasard."""
    reponse = client.get(
        reverse("annonces:marche"), {"categorie": "'; DROP TABLE annonces; --"}
    )
    assert reponse.status_code == 200
    assert annonce.titre in reponse.content.decode()


# --- pages authentifiées ------------------------------------------------------


def test_formulaire_de_creation(connexion, vendeur):
    reponse = connexion(vendeur).get(reverse("annonces:nouvelle"))
    assert reponse.status_code == 200


def test_formulaire_de_modification(connexion, vendeur, annonce):
    reponse = connexion(vendeur).get(reverse("annonces:modifier", args=[annonce.pk]))
    assert reponse.status_code == 200
    assert annonce.titre in reponse.content.decode()


def test_page_profil(connexion, vendeur):
    reponse = connexion(vendeur).get(reverse("comptes:profil"))
    assert reponse.status_code == 200


def test_tunnel_de_commande(connexion, acheteur, annonce):
    reponse = connexion(acheteur).get(reverse("commandes:commander", args=[annonce.pk]))
    assert reponse.status_code == 200


def test_page_de_paiement_et_detail_commande(connexion, acheteur, annonce):
    commande = services.creer_commande(
        acheteur=acheteur,
        annonce=annonce,
        quantite=Decimal("1"),
        mode_livraison="retrait",
    )
    client = connexion(acheteur)

    reponse = client.get(
        reverse("commandes:paiement_simule", args=[commande.paiement.ref_agregateur])
    )
    assert reponse.status_code == 200

    reponse = client.get(reverse("commandes:detail", args=[commande.pk]))
    assert reponse.status_code == 200


def test_le_detail_dune_commande_est_invisible_aux_tiers(
    connexion, acheteur, autre_acheteur, annonce
):
    commande = services.creer_commande(
        acheteur=acheteur,
        annonce=annonce,
        quantite=Decimal("1"),
        mode_livraison="retrait",
    )
    reponse = connexion(autre_acheteur).get(
        reverse("commandes:detail", args=[commande.pk])
    )
    assert reponse.status_code == 404


def test_le_vendeur_voit_le_detail_de_sa_vente(connexion, vendeur, acheteur, annonce):
    commande = services.creer_commande(
        acheteur=acheteur,
        annonce=annonce,
        quantite=Decimal("1"),
        mode_livraison="retrait",
    )
    reponse = connexion(vendeur).get(reverse("commandes:detail", args=[commande.pk]))
    assert reponse.status_code == 200


# --- création et modification d'annonce ---------------------------------------


def test_creer_une_annonce_sans_photo(connexion, vendeur):
    client = connexion(vendeur)
    reponse = client.post(
        reverse("annonces:nouvelle"),
        {
            "titre": "Tomates fraîches",
            "categorie": "Légumes",
            "description": "Cueillies ce matin.",
            "prix": 800,
            "unite": "kg",
            "quantite_dispo": "120",
            "region": "Plateaux",
            "statut": metier.STATUT_ACTIVE,
        },
    )
    assert reponse.status_code == 302
    assert vendeur.annonces.filter(titre="Tomates fraîches").exists()


def test_un_prix_nul_est_refuse(connexion, vendeur):
    client = connexion(vendeur)
    reponse = client.post(
        reverse("annonces:nouvelle"),
        {
            "titre": "Don gratuit",
            "categorie": "Légumes",
            "description": "Test.",
            "prix": 0,
            "unite": "kg",
            "quantite_dispo": "10",
            "region": "Plateaux",
            "statut": metier.STATUT_ACTIVE,
        },
    )
    assert reponse.status_code == 200  # le formulaire est réaffiché avec l'erreur
    assert not vendeur.annonces.filter(titre="Don gratuit").exists()


def test_suspendre_puis_remettre_en_ligne(connexion, vendeur, annonce):
    client = connexion(vendeur)
    client.post(reverse("annonces:basculer_statut", args=[annonce.pk]))
    annonce.refresh_from_db()
    assert annonce.statut == metier.STATUT_SUSPENDUE

    client.post(reverse("annonces:basculer_statut", args=[annonce.pk]))
    annonce.refresh_from_db()
    assert annonce.statut == metier.STATUT_ACTIVE


def test_une_annonce_epuisee_ne_se_remet_pas_en_ligne_dun_clic(
    connexion, vendeur, annonce
):
    annonce.quantite_dispo = Decimal("0")
    annonce.statut = metier.STATUT_SUSPENDUE
    annonce.save()

    client = connexion(vendeur)
    client.post(reverse("annonces:basculer_statut", args=[annonce.pk]))
    annonce.refresh_from_db()
    assert annonce.statut == metier.STATUT_SUSPENDUE
