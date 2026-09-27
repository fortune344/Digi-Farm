"""Autorisation côté serveur — les tests qui comptent vraiment.

SQLite n'a pas de RLS : si ces tests passent, l'isolation tient ; s'ils cassent,
n'importe qui peut lire ou modifier les données d'autrui.
Voir docs/blueprints/autorisation.md.
"""

import pytest
from django.urls import reverse

from annonces.models import Annonce
from core import metier

pytestmark = pytest.mark.django_db


# --- session ------------------------------------------------------------------


def test_tableau_de_bord_exige_une_session(client):
    reponse = client.get(reverse("comptes:tableau_de_bord"))
    assert reponse.status_code == 302
    assert reverse("comptes:connexion") in reponse["Location"]


def test_profil_exige_une_session(client):
    reponse = client.get(reverse("comptes:profil"))
    assert reponse.status_code == 302


# --- rôle ---------------------------------------------------------------------


def test_un_acheteur_ne_peut_pas_publier_une_annonce(connexion, acheteur):
    client = connexion(acheteur)
    reponse = client.get(reverse("annonces:nouvelle"))
    assert reponse.status_code == 403


def test_un_vendeur_ne_peut_pas_commander(connexion, vendeur, annonce):
    client = connexion(vendeur)
    reponse = client.get(reverse("commandes:commander", args=[annonce.pk]))
    assert reponse.status_code == 403


def test_le_role_vient_de_la_base_pas_du_formulaire(connexion, acheteur):
    """Envoyer role=agriculteur dans un POST ne doit rien changer."""
    client = connexion(acheteur)
    reponse = client.post(
        reverse("comptes:profil"),
        {"nom": "Afi", "telephone": "", "region": "Kara", "role": "agriculteur"},
    )
    assert reponse.status_code == 302
    acheteur.profil.refresh_from_db()
    assert acheteur.profil.role == metier.ROLE_ACHETEUR


# --- propriété ----------------------------------------------------------------


def test_un_vendeur_ne_modifie_pas_lannonce_dun_autre(
    connexion, autre_vendeur, annonce
):
    client = connexion(autre_vendeur)
    reponse = client.get(reverse("annonces:modifier", args=[annonce.pk]))
    # 404 et non 403 : on ne confirme pas l'existence de la ressource.
    assert reponse.status_code == 404


def test_un_vendeur_ne_supprime_pas_lannonce_dun_autre(
    connexion, autre_vendeur, annonce
):
    client = connexion(autre_vendeur)
    reponse = client.post(reverse("annonces:supprimer", args=[annonce.pk]))
    assert reponse.status_code == 404
    assert Annonce.objects.filter(pk=annonce.pk).exists()


def test_un_vendeur_ne_suspend_pas_lannonce_dun_autre(
    connexion, autre_vendeur, annonce
):
    client = connexion(autre_vendeur)
    reponse = client.post(reverse("annonces:basculer_statut", args=[annonce.pk]))
    assert reponse.status_code == 404
    annonce.refresh_from_db()
    assert annonce.statut == metier.STATUT_ACTIVE


# --- méthodes HTTP ------------------------------------------------------------


def test_la_suppression_refuse_le_get(connexion, vendeur, annonce):
    """Un simple lien (GET) ne doit jamais détruire des données."""
    client = connexion(vendeur)
    reponse = client.get(reverse("annonces:supprimer", args=[annonce.pk]))
    assert reponse.status_code == 405
    assert Annonce.objects.filter(pk=annonce.pk).exists()


def test_la_deconnexion_refuse_le_get(connexion, vendeur):
    client = connexion(vendeur)
    reponse = client.get(reverse("comptes:deconnexion"))
    assert reponse.status_code == 405


# --- visibilité des annonces suspendues ---------------------------------------


def test_une_annonce_suspendue_est_invisible_au_public(client, annonce):
    annonce.statut = metier.STATUT_SUSPENDUE
    annonce.save()
    reponse = client.get(reverse("annonces:detail", args=[annonce.pk]))
    assert reponse.status_code == 404


def test_une_annonce_suspendue_reste_visible_a_son_proprietaire(
    connexion, vendeur, annonce
):
    annonce.statut = metier.STATUT_SUSPENDUE
    annonce.save()
    client = connexion(vendeur)
    reponse = client.get(reverse("annonces:detail", args=[annonce.pk]))
    assert reponse.status_code == 200


def test_le_marche_ne_montre_pas_les_annonces_suspendues(client, annonce):
    annonce.statut = metier.STATUT_SUSPENDUE
    annonce.save()
    reponse = client.get(reverse("annonces:marche"))
    assert reponse.status_code == 200
    assert annonce.titre not in reponse.content.decode()
