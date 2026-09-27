"""Garde-fous sur les gabarits : rien du langage de template ne doit fuir.

Ces tests existent à cause d'un vrai bug : la syntaxe {# … #} de Django ne tient
que sur UNE ligne. Un commentaire écrit sur deux lignes avec cette syntaxe n'est
pas reconnu et s'affiche littéralement dans la page — et placé dans le <head>,
le navigateur le remonte en haut de CHAQUE page du site.
"""

from pathlib import Path

import pytest
from django.conf import settings
from django.urls import reverse

DOSSIER_GABARITS = Path(settings.BASE_DIR) / "templates"


def _gabarits() -> list[Path]:
    return sorted(DOSSIER_GABARITS.rglob("*.html"))


def test_il_y_a_bien_des_gabarits_a_verifier():
    """Si ce test casse, les autres ne vérifient plus rien."""
    assert len(_gabarits()) > 15


def test_aucun_commentaire_court_sur_plusieurs_lignes():
    """{# … #} doit s'ouvrir et se fermer sur la même ligne.

    Pour un commentaire multi-ligne, utiliser {% comment %} … {% endcomment %}.
    """
    fautifs = []
    for gabarit in _gabarits():
        for numero, ligne in enumerate(
            gabarit.read_text(encoding="utf-8").splitlines(), start=1
        ):
            if "{#" in ligne and "#}" not in ligne:
                fautifs.append(
                    f"{gabarit.relative_to(DOSSIER_GABARITS)}:{numero} — {ligne.strip()[:70]}"
                )

    assert not fautifs, (
        "Commentaires {# … #} ouverts sur plusieurs lignes (ils s'afficheront "
        "dans la page) :\n  " + "\n  ".join(fautifs)
    )


def test_les_blocs_comment_sont_refermes():
    for gabarit in _gabarits():
        contenu = gabarit.read_text(encoding="utf-8")
        assert contenu.count("{% comment %}") == contenu.count("{% endcomment %}"), (
            f"{gabarit.relative_to(DOSSIER_GABARITS)} : "
            "un {% comment %} n'est pas refermé."
        )


# --- vérification sur le rendu réel ------------------------------------------

RESTES_INTERDITS = ("{#", "#}", "{%", "%}", "{{", "}}")


def _verifier_rendu(reponse) -> None:
    contenu = reponse.content.decode()
    for reste in RESTES_INTERDITS:
        assert reste not in contenu, (
            f"La page rend du code de gabarit non interprété : « {reste} » — "
            f"extrait : {contenu[max(0, contenu.find(reste) - 60) : contenu.find(reste) + 80]!r}"
        )


@pytest.mark.django_db
def test_les_pages_publiques_ne_laissent_rien_fuir(client, annonce):
    for nom in ("annonces:accueil", "annonces:marche", "comptes:connexion", "comptes:inscription"):
        _verifier_rendu(client.get(reverse(nom)))
    _verifier_rendu(client.get(reverse("annonces:detail", args=[annonce.pk])))


@pytest.mark.django_db
def test_les_pages_du_vendeur_ne_laissent_rien_fuir(connexion, vendeur, annonce):
    client = connexion(vendeur)
    _verifier_rendu(client.get(reverse("comptes:tableau_de_bord")))
    _verifier_rendu(client.get(reverse("comptes:profil")))
    _verifier_rendu(client.get(reverse("annonces:nouvelle")))
    _verifier_rendu(client.get(reverse("annonces:modifier", args=[annonce.pk])))


@pytest.mark.django_db
def test_les_pages_de_lacheteur_ne_laissent_rien_fuir(connexion, acheteur, annonce):
    from decimal import Decimal

    from commandes import services

    client = connexion(acheteur)
    _verifier_rendu(client.get(reverse("comptes:tableau_de_bord")))
    _verifier_rendu(client.get(reverse("commandes:commander", args=[annonce.pk])))

    commande = services.creer_commande(
        acheteur=acheteur,
        annonce=annonce,
        quantite=Decimal("1"),
        mode_livraison="retrait",
    )
    _verifier_rendu(
        client.get(
            reverse("commandes:paiement_simule", args=[commande.paiement.ref_agregateur])
        )
    )
    _verifier_rendu(client.get(reverse("commandes:detail", args=[commande.pk])))
