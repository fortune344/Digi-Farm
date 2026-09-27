"""Décide si le séquestre peut être libéré — logique PURE, testable.

Libérer = PayOut vers l'agriculteur du montant net (total − commission).
Cette fonction ne touche ni la base ni l'agrégateur : elle décide, c'est tout.
Le service qui l'appelle (commandes.services) exécute.
"""

from dataclasses import dataclass

from core import metier

from .tarifs import net_vendeur


@dataclass(frozen=True)
class DecisionLiberation:
    ok: bool
    net: int = 0
    raison: str = ""


def planifier_liberation(statut_commande: str, paiement) -> DecisionLiberation:
    """Vérifie les trois conditions de libération, dans cet ordre :
    pas de litige, pas déjà libéré, fonds effectivement sous séquestre.
    """
    if statut_commande == metier.CMD_LITIGE:
        return DecisionLiberation(
            ok=False, raison="Un litige est en cours sur cette commande."
        )
    if paiement.statut_sequestre == metier.SEQ_LIBERE:
        return DecisionLiberation(ok=False, raison="Le paiement a déjà été libéré.")
    if paiement.statut_sequestre != metier.SEQ_SEQUESTRE:
        return DecisionLiberation(
            ok=False, raison="Les fonds ne sont pas sous séquestre."
        )
    return DecisionLiberation(
        ok=True, net=net_vendeur(paiement.montant, paiement.frais_commission)
    )
