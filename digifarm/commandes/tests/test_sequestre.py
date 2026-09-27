"""Machine à états du séquestre. Port de src/lib/payments/escrow.test.ts.

C'est le test le plus important du projet : il garantit qu'aucun chemin de code
ne peut faire sortir l'argent autrement que par les transitions prévues.
"""

import pytest

from commandes.sequestre import ErreurSequestre, peut_transiter, verifier_transition
from core import metier


def test_parcours_nominal():
    assert peut_transiter(metier.SEQ_ATTENTE, metier.SEQ_COLLECTE)
    assert peut_transiter(metier.SEQ_COLLECTE, metier.SEQ_SEQUESTRE)
    assert peut_transiter(metier.SEQ_SEQUESTRE, metier.SEQ_LIBERE)


def test_remboursement_possible_avant_liberation():
    assert peut_transiter(metier.SEQ_ATTENTE, metier.SEQ_REMBOURSE)
    assert peut_transiter(metier.SEQ_COLLECTE, metier.SEQ_REMBOURSE)
    assert peut_transiter(metier.SEQ_SEQUESTRE, metier.SEQ_REMBOURSE)


def test_on_ne_libere_jamais_sans_sequestre():
    """Le raccourci qui paierait le vendeur sans que l'argent soit collecté."""
    assert not peut_transiter(metier.SEQ_ATTENTE, metier.SEQ_LIBERE)
    assert not peut_transiter(metier.SEQ_COLLECTE, metier.SEQ_LIBERE)


def test_etats_terminaux():
    assert not peut_transiter(metier.SEQ_LIBERE, metier.SEQ_REMBOURSE)
    assert not peut_transiter(metier.SEQ_LIBERE, metier.SEQ_SEQUESTRE)
    assert not peut_transiter(metier.SEQ_REMBOURSE, metier.SEQ_LIBERE)


def test_double_liberation_impossible():
    assert not peut_transiter(metier.SEQ_LIBERE, metier.SEQ_LIBERE)


def test_verification_leve():
    with pytest.raises(ErreurSequestre, match="interdite"):
        verifier_transition(metier.SEQ_ATTENTE, metier.SEQ_LIBERE)
