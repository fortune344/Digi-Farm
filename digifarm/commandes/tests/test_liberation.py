"""Décision de libération. Port de src/lib/orders/release.test.ts."""

from dataclasses import dataclass

from commandes.liberation import planifier_liberation
from core import metier


@dataclass
class PaiementFactice:
    """Assez de champs pour la décision — pas besoin de la base."""

    statut_sequestre: str
    montant: int = 1000
    frais_commission: int = 50


def test_libere_le_net_quand_sequestre_et_sans_litige():
    decision = planifier_liberation(
        metier.CMD_EXPEDIEE, PaiementFactice(metier.SEQ_SEQUESTRE)
    )
    assert decision.ok
    assert decision.net == 950


def test_refuse_en_cas_de_litige():
    decision = planifier_liberation(
        metier.CMD_LITIGE, PaiementFactice(metier.SEQ_SEQUESTRE)
    )
    assert not decision.ok
    assert "litige" in decision.raison.lower()


def test_refuse_si_deja_libere():
    decision = planifier_liberation(
        metier.CMD_LIVREE, PaiementFactice(metier.SEQ_LIBERE)
    )
    assert not decision.ok
    assert "déjà" in decision.raison.lower()


def test_refuse_si_fonds_pas_sequestres():
    decision = planifier_liberation(
        metier.CMD_PAYEE, PaiementFactice(metier.SEQ_ATTENTE)
    )
    assert not decision.ok


def test_litige_prime_sur_tout_le_reste():
    """Même avec des fonds bien séquestrés, le litige bloque (règle n°5)."""
    decision = planifier_liberation(
        metier.CMD_LITIGE, PaiementFactice(metier.SEQ_SEQUESTRE, 50000, 2500)
    )
    assert not decision.ok
