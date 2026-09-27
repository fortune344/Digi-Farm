"""Formatage français des montants."""

from decimal import Decimal

from core.formatage import ESPACE_FINE, fcfa, nombre_fr, quantite_unite, stock


def test_fcfa_groupe_les_milliers():
    assert fcfa(1500) == f"1{ESPACE_FINE}500{ESPACE_FINE}FCFA"
    assert fcfa(1250000) == f"1{ESPACE_FINE}250{ESPACE_FINE}000{ESPACE_FINE}FCFA"


def test_fcfa_sans_decimales():
    assert fcfa(750) == f"750{ESPACE_FINE}FCFA"
    assert fcfa(0) == f"0{ESPACE_FINE}FCFA"


def test_virgule_decimale_francaise():
    assert nombre_fr(Decimal("2.5")) == "2,5"
    # Une décimale nulle ne s'affiche pas : « 3 » et non « 3,00 ».
    assert nombre_fr(Decimal("3.00")) == "3"


def test_espace_est_insecable():
    """Un prix ne doit jamais se couper en fin de ligne."""
    assert " " not in fcfa(1500)  # espace ordinaire absente
    assert ESPACE_FINE in fcfa(1500)


def test_quantite_et_stock():
    assert quantite_unite(Decimal("2.5"), "tonne") == "2,5 / tonne"
    assert stock(100, "kg") == "100 kg"
