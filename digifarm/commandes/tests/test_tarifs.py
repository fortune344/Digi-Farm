"""Calculs d'argent. Port de src/lib/orders/pricing.test.ts."""

from decimal import Decimal

from commandes.tarifs import calculer_commission, calculer_total, net_vendeur


def test_total_prix_fois_quantite():
    assert calculer_total(500, 3) == 1500
    assert calculer_total(300, Decimal("2.5")) == 750


def test_commission_5_pourcent():
    assert calculer_commission(1000) == 50
    assert calculer_commission(1500) == 75


def test_net_vendeur():
    total = 18000
    assert net_vendeur(total, calculer_commission(total)) == 17100


def test_arrondi_au_franc_superieur():
    """0,5 doit monter (ROUND_HALF_UP), pas s'arrondir au pair comme round()."""
    # 5 % de 1050 = 52,5 → 53, et non 52.
    assert calculer_commission(1050) == 53
    # 150 × 1,5 = 225 exactement ; 333 × 0,5 = 166,5 → 167.
    assert calculer_total(150, Decimal("1.5")) == 225
    assert calculer_total(333, Decimal("0.5")) == 167


def test_quantite_decimale_ne_perd_pas_de_franc():
    """Le float 0.1 × 3 vaut 0.30000000000000004 ; Decimal évite ce piège."""
    assert calculer_total(10000, Decimal("0.3")) == 3000
