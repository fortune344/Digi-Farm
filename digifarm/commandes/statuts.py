"""Machine à états du STATUT DE COMMANDE — logique PURE, testable.

Aucune vue ne change un statut sans passer par ces vérifications : c'est ce qui
empêche, par exemple, de « livrer » une commande jamais payée.
"""

from core import metier

# Transitions autorisées. Toute transition absente d'ici est interdite.
TRANSITIONS: dict[str, tuple[str, ...]] = {
    metier.CMD_ATTENTE_PAIEMENT: (metier.CMD_PAYEE, metier.CMD_ANNULEE),
    metier.CMD_PAYEE: (metier.CMD_PREPAREE, metier.CMD_LIVREE, metier.CMD_LITIGE),
    metier.CMD_PREPAREE: (metier.CMD_EXPEDIEE, metier.CMD_LIVREE, metier.CMD_LITIGE),
    metier.CMD_EXPEDIEE: (metier.CMD_LIVREE, metier.CMD_LITIGE),
    metier.CMD_LITIGE: (metier.CMD_LIVREE, metier.CMD_ANNULEE),
    metier.CMD_LIVREE: (),
    metier.CMD_ANNULEE: (),
}

# Étapes montrées à l'utilisateur dans le suivi de commande, dans l'ordre.
ETAPES_SUIVI = (
    metier.CMD_PAYEE,
    metier.CMD_PREPAREE,
    metier.CMD_EXPEDIEE,
    metier.CMD_LIVREE,
)


class ErreurStatutCommande(Exception):
    """Transition de statut de commande interdite."""


def peut_changer_statut(depart: str, arrivee: str) -> bool:
    return arrivee in TRANSITIONS.get(depart, ())


def verifier_changement_statut(depart: str, arrivee: str) -> None:
    if not peut_changer_statut(depart, arrivee):
        raise ErreurStatutCommande(
            f"Transition de commande interdite : {depart} → {arrivee}"
        )


def peut_ouvrir_litige(statut: str) -> bool:
    """Un litige ne s'ouvre que sur une commande payée et pas encore livrée."""
    return statut in (metier.CMD_PAYEE, metier.CMD_PREPAREE, metier.CMD_EXPEDIEE)


def index_etape(statut: str) -> int:
    """Position dans ETAPES_SUIVI, ou -1 si le statut est hors du parcours normal
    (en attente de paiement, annulée, litige)."""
    try:
        return ETAPES_SUIVI.index(statut)
    except ValueError:
        return -1
