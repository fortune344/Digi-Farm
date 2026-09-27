"""Formatage des nombres à la française. Port de src/lib/format.ts.

L'espace des milliers est une espace fine insécable (U+202F), comme le fait
Intl.NumberFormat("fr-FR") côté JavaScript : « 1 500 FCFA » ne se coupe jamais
en fin de ligne.
"""

from decimal import Decimal

ESPACE_FINE = "\u202f"


def _groupes_milliers(entier: str) -> str:
    morceaux = []
    while len(entier) > 3:
        morceaux.insert(0, entier[-3:])
        entier = entier[:-3]
    morceaux.insert(0, entier)
    return ESPACE_FINE.join(morceaux)


def nombre_fr(valeur, decimales: int = 2) -> str:
    """12345.5 → « 12 345,5 ». Les décimales nulles ne sont pas affichées."""
    if valeur is None:
        return ""
    quantifie = Decimal(str(valeur)).quantize(Decimal(1).scaleb(-decimales))
    signe = "-" if quantifie < 0 else ""
    entier, _, frac = str(abs(quantifie)).partition(".")
    frac = frac.rstrip("0")
    resultat = signe + _groupes_milliers(entier)
    return f"{resultat},{frac}" if frac else resultat


def fcfa(valeur) -> str:
    """Prix en francs CFA, sans décimales : 1500 → « 1 500 FCFA »."""
    if valeur is None:
        return ""
    return f"{nombre_fr(valeur, 0)}{ESPACE_FINE}FCFA"


def quantite_unite(valeur, unite: str) -> str:
    """Prix unitaire : 2.5 + « tonne » → « 2,5 / tonne »."""
    return f"{nombre_fr(valeur)} / {unite}"


def stock(valeur, unite: str) -> str:
    """Stock disponible : 100 + « kg » → « 100 kg »."""
    return f"{nombre_fr(valeur)} {unite}"
