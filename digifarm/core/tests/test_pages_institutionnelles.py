"""Pages institutionnelles : à propos, contact, FAQ, mentions légales.

Un site sans page de contact ni mentions légales n'inspire pas confiance — et
sur une plateforme où l'on demande aux gens de payer en ligne, la confiance est
le produit.
"""

import pytest
from django.urls import reverse

from core.models import MessageContact

pytestmark = pytest.mark.django_db


PAGES = [
    "core:a_propos",
    "core:contact",
    "core:faq",
    "core:conditions",
    "core:confidentialite",
]


@pytest.mark.parametrize("nom", PAGES)
def test_la_page_repond(client, nom):
    assert client.get(reverse(nom)).status_code == 200


@pytest.mark.parametrize("nom", PAGES)
def test_la_page_est_liee_depuis_le_pied_de_page(client, nom):
    """Une page que rien ne référence n'existe pas vraiment."""
    accueil = client.get(reverse("annonces:accueil")).content.decode()
    assert reverse(nom) in accueil


def test_les_chiffres_affiches_sont_ceux_de_la_base(client, annonce):
    reponse = client.get(reverse("core:a_propos"))
    assert reponse.context["nb_annonces"] == 1
    assert reponse.context["nb_vendeurs"] == 1
    assert reponse.context["commission"] == 5


# --- formulaire de contact ----------------------------------------------------


def _message_valide(**surcharges) -> dict:
    donnees = {
        "nom": "Kodjo Mensah",
        "email": "kodjo@exemple.tg",
        "telephone": "+228 90 11 22 33",
        "sujet": "vendre",
        "message": "Bonjour, je cultive du maïs à Kara et je voudrais vendre.",
    }
    donnees.update(surcharges)
    return donnees


def test_un_message_est_enregistre(client):
    reponse = client.post(reverse("core:contact"), _message_valide())
    assert reponse.status_code == 302

    message = MessageContact.objects.get()
    assert message.nom == "Kodjo Mensah"
    assert message.sujet == "vendre"
    assert not message.traite


def test_le_message_dun_utilisateur_connecte_est_rattache_a_son_compte(
    connexion, acheteur
):
    client = connexion(acheteur)
    client.post(reverse("core:contact"), _message_valide())
    assert MessageContact.objects.get().auteur == acheteur


def test_le_formulaire_est_prerempli_pour_un_utilisateur_connecte(connexion, vendeur):
    reponse = connexion(vendeur).get(reverse("core:contact"))
    formulaire = reponse.context["formulaire"]
    assert formulaire.initial["nom"] == "Kodjo Mensah"
    assert formulaire.initial["email"] == vendeur.email


def test_un_message_trop_court_est_refuse(client):
    reponse = client.post(reverse("core:contact"), _message_valide(message="Salut"))
    assert reponse.status_code == 200  # formulaire réaffiché avec l'erreur
    assert not MessageContact.objects.exists()


def test_le_pot_de_miel_bloque_les_robots(client):
    """Un champ invisible rempli = un automate, pas un visiteur."""
    reponse = client.post(
        reverse("core:contact"), _message_valide(site_web="http://spam.example")
    )
    assert reponse.status_code == 200
    assert not MessageContact.objects.exists()


# --- page 404 ------------------------------------------------------------------


def test_la_page_404_est_personnalisee(client, settings):
    """Avec DEBUG actif, Django affiche sa propre page : on teste en conditions
    de production."""
    settings.DEBUG = False
    settings.ALLOWED_HOSTS = ["testserver"]
    reponse = client.get("/une-adresse-qui-nexiste-pas/")
    assert reponse.status_code == 404
    contenu = reponse.content.decode()
    assert "Cette page n'existe pas" in contenu
    assert reverse("annonces:marche") in contenu
