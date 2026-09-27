"""Calculs d'argent — PURS, sans base de données, donc testables.

Toujours refaits CÔTÉ SERVEUR : on ne fait jamais confiance à un total envoyé
par le client (règle n°9).

Arrondi : ROUND_HALF_UP (0,5 → 1), comme le Math.round() de l'implémentation
Next.js. Le round() de Python arrondit au pair le plus proche (0,5 → 0), ce qui
ferait perdre un franc de façon invisible — on ne l'utilise pas ici.
"""

from decimal import ROUND_HALF_UP, Decimal

from core.metier import TAUX_COMMISSION


def _arrondi_fcfa(valeur: Decimal) -> int:
    """Arrondit au franc CFA (pas de centimes en XOF)."""
    return int(valeur.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def calculer_total(prix_unitaire: int, quantite: Decimal | float | str) -> int:
    """Total d'une ligne : prix unitaire × quantité, arrondi au franc."""
    return _arrondi_fcfa(Decimal(prix_unitaire) * Decimal(str(quantite)))


def calculer_commission(total: int, taux: Decimal = TAUX_COMMISSION) -> int:
    """Commission de la plateforme, prélevée à la libération du séquestre."""
    return _arrondi_fcfa(Decimal(total) * Decimal(str(taux)))


def net_vendeur(total: int, commission: int) -> int:
    """Ce que touche réellement l'agriculteur au PayOut."""
    return total - commission
