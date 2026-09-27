"""Interface vers l'agrégateur de paiement mobile money / carte.

Aujourd'hui : agrégateur SIMULÉ (bac à sable local), faute de compte marchand.
Demain : brancher CinetPay / FedaPay / Hub2 ici, en implémentant la même
interface contre leur API DOCUMENTÉE (voir docs/blueprints/paiement.md).

Règle n°4 : NE PAS inventer d'endpoint ni de nom de champ. Lire la doc
officielle de l'agrégateur retenu avant d'écrire la vraie implémentation.

Port de src/lib/payments/provider.ts et mock-provider.ts.
"""

import hashlib
import hmac
import json
import uuid
from dataclasses import dataclass
from typing import Protocol

from django.conf import settings
from django.urls import reverse


@dataclass(frozen=True)
class DemandePaiement:
    """PayIn : ce qu'on envoie à l'agrégateur pour encaisser l'acheteur."""

    ref: str
    montant: int
    commande_id: str


@dataclass(frozen=True)
class DemandeReversement:
    """PayOut : reversement à l'agriculteur du montant NET (total − commission)."""

    ref: str
    montant: int
    commande_id: str


@dataclass(frozen=True)
class ResultatReversement:
    ok: bool
    ref_reversement: str = ""
    message: str = ""


class Agregateur(Protocol):
    """Contrat que doit respecter tout agrégateur branché sur Digi-Farm."""

    nom: str

    def creer_paiement(self, demande: DemandePaiement) -> str:
        """Renvoie l'URL vers laquelle rediriger l'acheteur pour payer."""
        ...

    def reverser(self, demande: DemandeReversement) -> ResultatReversement:
        """Verse les fonds à l'agriculteur (libération du séquestre)."""
        ...


class AgregateurSimule:
    """Agrégateur de test : redirige vers une page de paiement locale.

    Le reversement réussit toujours — c'est une simulation, pas une garantie.
    Le jour où un vrai agrégateur est branché, le reversement pourra échouer et
    le code appelant doit déjà savoir gérer ce cas (il le fait).
    """

    nom = "simule"

    def creer_paiement(self, demande: DemandePaiement) -> str:
        return reverse("commandes:paiement_simule", args=[demande.ref])

    def reverser(self, demande: DemandeReversement) -> ResultatReversement:
        if demande.montant <= 0:
            return ResultatReversement(ok=False, message="Montant de reversement nul.")
        return ResultatReversement(ok=True, ref_reversement=f"PAYOUT-{uuid.uuid4().hex[:12]}")


def agregateur_courant() -> Agregateur:
    """Point d'entrée unique : le reste du code ne connaît que cette fonction."""
    return AgregateurSimule()


# --- Signature des webhooks ---------------------------------------------------


def signer(charge_utile: dict) -> str:
    """Signature HMAC-SHA256 du corps du webhook.

    Le schéma exact (ordre des champs, encodage, en-tête) devra être remplacé
    par celui de l'agrégateur réel — chacun a le sien.
    """
    corps = json.dumps(charge_utile, separators=(",", ":"), sort_keys=True)
    return hmac.new(
        settings.PAYMENT_WEBHOOK_SECRET.encode("utf-8"),
        corps.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def signature_valide(corps_brut: bytes, signature_recue: str) -> bool:
    """Vérifie la signature d'un webhook entrant.

    Comparaison en temps constant : une comparaison naïve (==) laisserait fuir
    la signature attendue caractère par caractère.
    """
    if not signature_recue:
        return False
    attendue = hmac.new(
        settings.PAYMENT_WEBHOOK_SECRET.encode("utf-8"),
        corps_brut,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(attendue, signature_recue.strip())
