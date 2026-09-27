"""Commandes, lignes de commande et paiement sous séquestre.

Règle n°5 : l'argent d'une commande est SÉQUESTRÉ. Il n'est reversé à
l'agriculteur qu'après confirmation de réception par l'acheteur.
Voir docs/blueprints/paiement.md.

Tous les montants sont en FCFA entiers.
"""

import uuid

from django.conf import settings
from django.db import models
from django.urls import reverse

from core import metier


class CommandeQuerySet(models.QuerySet):
    def de_lacheteur(self, utilisateur):
        return self.filter(acheteur=utilisateur)

    def de_lagriculteur(self, utilisateur):
        return self.filter(agriculteur=utilisateur)

    def payees(self):
        """Commandes réellement engagées (le panier abandonné ne compte pas)."""
        return self.exclude(statut=metier.CMD_ATTENTE_PAIEMENT)

    def a_traiter(self):
        """Commandes qui attendent une action de l'agriculteur."""
        return self.filter(statut__in=[metier.CMD_PAYEE, metier.CMD_PREPAREE])

    def avec_details(self):
        return self.select_related("paiement", "acheteur__profil", "agriculteur__profil")


class Commande(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    acheteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="achats",
        verbose_name="acheteur",
    )
    agriculteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ventes",
        verbose_name="agriculteur",
    )
    statut = models.CharField(
        "statut",
        max_length=25,
        choices=metier.STATUTS_COMMANDE,
        default=metier.CMD_ATTENTE_PAIEMENT,
    )
    total = models.PositiveIntegerField("total en FCFA")
    mode_livraison = models.CharField(
        "mode de livraison", max_length=20, choices=metier.MODES_LIVRAISON
    )
    adresse_livraison = models.TextField("adresse de livraison", blank=True)
    litige_motif = models.TextField("motif du litige", blank=True)
    cree_le = models.DateTimeField("créée le", auto_now_add=True)
    modifie_le = models.DateTimeField("modifiée le", auto_now=True)

    objects = CommandeQuerySet.as_manager()

    class Meta:
        db_table = "commandes"
        verbose_name = "commande"
        verbose_name_plural = "commandes"
        ordering = ["-cree_le"]
        indexes = [
            models.Index(fields=["agriculteur", "statut"], name="idx_cmd_vendeur"),
            models.Index(fields=["acheteur", "-cree_le"], name="idx_cmd_acheteur"),
        ]

    def __str__(self) -> str:
        return f"Commande {str(self.pk)[:8]} — {self.get_statut_display()}"

    def get_absolute_url(self) -> str:
        return reverse("commandes:detail", args=[self.pk])

    @property
    def reference_courte(self) -> str:
        """8 premiers caractères de l'UUID, pour affichage humain."""
        return str(self.pk)[:8].upper()

    @property
    def en_litige(self) -> bool:
        return self.statut == metier.CMD_LITIGE


class LigneCommande(models.Model):
    """Instantané figé au moment de l'achat : le titre et le prix ne bougent plus,
    même si l'agriculteur modifie ou supprime son annonce ensuite."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    commande = models.ForeignKey(
        Commande,
        on_delete=models.CASCADE,
        related_name="lignes",
        verbose_name="commande",
    )
    annonce = models.ForeignKey(
        "annonces.Annonce",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lignes_commande",
        verbose_name="annonce",
    )
    titre = models.CharField("titre au moment de l'achat", max_length=140)
    prix_unitaire = models.PositiveIntegerField("prix unitaire en FCFA")
    quantite = models.DecimalField("quantité", max_digits=10, decimal_places=2)

    class Meta:
        db_table = "commande_lignes"
        verbose_name = "ligne de commande"
        verbose_name_plural = "lignes de commande"

    def __str__(self) -> str:
        return f"{self.quantite} × {self.titre}"

    @property
    def sous_total(self) -> int:
        return int(self.prix_unitaire * self.quantite)


class Paiement(models.Model):
    """Un paiement par commande. `statut_sequestre` est la machine à états de
    l'argent ; elle ne doit JAMAIS être modifiée directement depuis une vue :
    passer par commandes.sequestre (transitions vérifiées + journal)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    commande = models.OneToOneField(
        Commande,
        on_delete=models.CASCADE,
        related_name="paiement",
        verbose_name="commande",
    )
    montant = models.PositiveIntegerField("montant en FCFA")
    frais_commission = models.PositiveIntegerField("commission plateforme en FCFA")
    statut_sequestre = models.CharField(
        "statut du séquestre",
        max_length=20,
        choices=metier.STATUTS_SEQUESTRE,
        default=metier.SEQ_ATTENTE,
    )
    methode = models.CharField(
        "méthode", max_length=20, choices=metier.METHODES_PAIEMENT, blank=True
    )
    ref_agregateur = models.UUIDField(
        "référence agrégateur", default=uuid.uuid4, unique=True, editable=False
    )
    cree_le = models.DateTimeField("créé le", auto_now_add=True)
    modifie_le = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        db_table = "paiements"
        verbose_name = "paiement"
        verbose_name_plural = "paiements"
        ordering = ["-cree_le"]

    def __str__(self) -> str:
        return f"{self.montant} FCFA — {self.get_statut_sequestre_display()}"

    @property
    def montant_net_vendeur(self) -> int:
        """Ce que touche l'agriculteur à la libération : total − commission."""
        return self.montant - self.frais_commission

    @property
    def est_sous_sequestre(self) -> bool:
        return self.statut_sequestre == metier.SEQ_SEQUESTRE


class JournalPaiement(models.Model):
    """Trace inaltérable de chaque transition du séquestre (piste d'audit).

    On n'efface ni ne modifie jamais une ligne : c'est la preuve de ce qui est
    arrivé à l'argent.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    paiement = models.ForeignKey(
        Paiement,
        on_delete=models.CASCADE,
        related_name="journal",
        verbose_name="paiement",
    )
    statut_depart = models.CharField(
        "statut de départ", max_length=20, choices=metier.STATUTS_SEQUESTRE, blank=True
    )
    statut_arrivee = models.CharField(
        "statut d'arrivée", max_length=20, choices=metier.STATUTS_SEQUESTRE
    )
    acteur = models.CharField("acteur", max_length=30)
    montant = models.PositiveIntegerField("montant en FCFA")
    note = models.CharField("note", max_length=255, blank=True)
    cree_le = models.DateTimeField("horodatage", auto_now_add=True)

    class Meta:
        db_table = "paiement_journal"
        verbose_name = "entrée de journal"
        verbose_name_plural = "journal des paiements"
        ordering = ["cree_le"]

    def __str__(self) -> str:
        depart = self.statut_depart or "—"
        return f"{depart} → {self.statut_arrivee} ({self.acteur})"
