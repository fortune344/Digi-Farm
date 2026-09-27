"""Machine à états du statut de commande. Port de src/lib/orders/order-status.test.ts."""

import pytest

from commandes.statuts import (
    ErreurStatutCommande,
    index_etape,
    peut_changer_statut,
    peut_ouvrir_litige,
    verifier_changement_statut,
)
from core import metier


def test_parcours_normal_autorise():
    assert peut_changer_statut(metier.CMD_ATTENTE_PAIEMENT, metier.CMD_PAYEE)
    assert peut_changer_statut(metier.CMD_PAYEE, metier.CMD_PREPAREE)
    assert peut_changer_statut(metier.CMD_PREPAREE, metier.CMD_EXPEDIEE)
    assert peut_changer_statut(metier.CMD_EXPEDIEE, metier.CMD_LIVREE)


def test_on_ne_saute_pas_le_paiement():
    assert not peut_changer_statut(metier.CMD_ATTENTE_PAIEMENT, metier.CMD_LIVREE)
    assert not peut_changer_statut(metier.CMD_ATTENTE_PAIEMENT, metier.CMD_EXPEDIEE)


def test_statuts_terminaux_sont_fermes():
    assert not peut_changer_statut(metier.CMD_LIVREE, metier.CMD_EXPEDIEE)
    assert not peut_changer_statut(metier.CMD_LIVREE, metier.CMD_LITIGE)
    assert not peut_changer_statut(metier.CMD_ANNULEE, metier.CMD_PAYEE)


def test_on_ne_revient_pas_en_arriere():
    assert not peut_changer_statut(metier.CMD_EXPEDIEE, metier.CMD_PREPAREE)
    assert not peut_changer_statut(metier.CMD_PREPAREE, metier.CMD_PAYEE)


def test_verification_leve_sur_transition_interdite():
    with pytest.raises(ErreurStatutCommande, match="interdite"):
        verifier_changement_statut(metier.CMD_LIVREE, metier.CMD_PAYEE)


def test_litige_seulement_entre_paiement_et_livraison():
    assert peut_ouvrir_litige(metier.CMD_PAYEE)
    assert peut_ouvrir_litige(metier.CMD_PREPAREE)
    assert peut_ouvrir_litige(metier.CMD_EXPEDIEE)
    assert not peut_ouvrir_litige(metier.CMD_ATTENTE_PAIEMENT)
    assert not peut_ouvrir_litige(metier.CMD_LIVREE)
    assert not peut_ouvrir_litige(metier.CMD_ANNULEE)


def test_index_etape_pour_le_suivi():
    assert index_etape(metier.CMD_PAYEE) == 0
    assert index_etape(metier.CMD_LIVREE) == 3
    # Hors parcours normal : pas de position dans la frise.
    assert index_etape(metier.CMD_LITIGE) == -1
    assert index_etape(metier.CMD_ATTENTE_PAIEMENT) == -1
