"""Machine à états du SÉQUESTRE — logique PURE, testable.

Voir docs/blueprints/paiement.md :

    en_attente → collecte → sequestre → libere
                                ↘ rembourse (litige tranché en faveur de l'acheteur)

`libere` et `rembourse` sont terminaux : l'argent est parti, on ne revient pas.
"""

from core import metier

TRANSITIONS: dict[str, tuple[str, ...]] = {
    metier.SEQ_ATTENTE: (metier.SEQ_COLLECTE, metier.SEQ_REMBOURSE),
    metier.SEQ_COLLECTE: (metier.SEQ_SEQUESTRE, metier.SEQ_REMBOURSE),
    metier.SEQ_SEQUESTRE: (metier.SEQ_LIBERE, metier.SEQ_REMBOURSE),
    metier.SEQ_LIBERE: (),
    metier.SEQ_REMBOURSE: (),
}


class ErreurSequestre(Exception):
    """Transition de séquestre interdite — l'argent ne bouge pas."""


def peut_transiter(depart: str, arrivee: str) -> bool:
    return arrivee in TRANSITIONS.get(depart, ())


def verifier_transition(depart: str, arrivee: str) -> None:
    if not peut_transiter(depart, arrivee):
        raise ErreurSequestre(
            f"Transition de séquestre interdite : {depart} → {arrivee}"
        )
