"""Fixtures partagées par tous les tests."""

from decimal import Decimal

import pytest
from django.contrib.auth.models import User

from annonces.models import Annonce
from comptes.models import Profil
from core import metier

MOT_DE_PASSE = "motdepasse-de-test-42"


def _creer_compte(email: str, role: str, nom: str) -> User:
    utilisateur = User.objects.create_user(
        username=email, email=email, password=MOT_DE_PASSE
    )
    Profil.objects.create(
        utilisateur=utilisateur, role=role, nom=nom, region="Maritime"
    )
    return utilisateur


@pytest.fixture
def vendeur(db) -> User:
    return _creer_compte("kodjo@test.tg", metier.ROLE_AGRICULTEUR, "Kodjo Mensah")


@pytest.fixture
def autre_vendeur(db) -> User:
    return _creer_compte("adjo@test.tg", metier.ROLE_AGRICULTEUR, "Adjo Nyuiadzi")


@pytest.fixture
def acheteur(db) -> User:
    return _creer_compte("afi@test.tg", metier.ROLE_ACHETEUR, "Afi Kponton")


@pytest.fixture
def autre_acheteur(db) -> User:
    return _creer_compte("sodji@test.tg", metier.ROLE_ACHETEUR, "Sodji Grossiste")


@pytest.fixture
def annonce(vendeur) -> Annonce:
    return Annonce.objects.create(
        agriculteur=vendeur,
        titre="Maïs blanc séché",
        categorie="Céréales",
        description="Récolte 2026, bien séché.",
        prix=15000,
        unite="sac",
        quantite_dispo=Decimal("40"),
        region="Maritime",
    )


@pytest.fixture
def connexion(client):
    """Connecte un utilisateur donné sur le client de test."""

    def _connecter(utilisateur: User):
        assert client.login(username=utilisateur.username, password=MOT_DE_PASSE)
        return client

    return _connecter
