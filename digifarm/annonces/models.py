"""Annonces publiées par les agriculteurs.

Le prix est en FCFA entier (le XOF n'a pas de centimes). La quantité disponible
est décimale (on vend 2,5 tonnes). Les photos sont une table à part, pour que
Django gère les fichiers, l'ordre et la suppression.
"""

import uuid

from django.conf import settings
from django.db import models
from django.urls import reverse

from core import metier


class AnnonceQuerySet(models.QuerySet):
    def publiables(self):
        """Annonces visibles sur le marché : actives et avec du stock."""
        return self.filter(statut=metier.STATUT_ACTIVE, quantite_dispo__gt=0)

    def de(self, utilisateur):
        return self.filter(agriculteur=utilisateur)


class Annonce(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agriculteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="annonces",
        verbose_name="agriculteur",
    )
    titre = models.CharField("titre", max_length=140)
    categorie = models.CharField("catégorie", max_length=40, choices=metier.CATEGORIES)
    description = models.TextField("description")
    prix = models.PositiveIntegerField("prix en FCFA")
    unite = models.CharField("unité de vente", max_length=10, choices=metier.UNITES)
    quantite_dispo = models.DecimalField(
        "quantité disponible", max_digits=10, decimal_places=2
    )
    region = models.CharField("région", max_length=20, choices=metier.REGIONS)
    statut = models.CharField(
        "statut",
        max_length=20,
        choices=metier.STATUTS_ANNONCE,
        default=metier.STATUT_ACTIVE,
    )
    cree_le = models.DateTimeField("créée le", auto_now_add=True)
    modifie_le = models.DateTimeField("modifiée le", auto_now=True)

    objects = AnnonceQuerySet.as_manager()

    class Meta:
        db_table = "annonces"
        verbose_name = "annonce"
        verbose_name_plural = "annonces"
        ordering = ["-cree_le"]
        indexes = [
            models.Index(fields=["statut", "-cree_le"], name="idx_annonce_statut_date"),
            models.Index(fields=["categorie"], name="idx_annonce_categorie"),
            models.Index(fields=["region"], name="idx_annonce_region"),
        ]

    def __str__(self) -> str:
        return self.titre

    def get_absolute_url(self) -> str:
        return reverse("annonces:detail", args=[self.pk])

    @property
    def photo_principale(self):
        return self.photos.first()

    @property
    def est_epuisee(self) -> bool:
        return self.quantite_dispo <= 0

    @property
    def est_disponible(self) -> bool:
        """Achetable : active ET en stock. L'affichage du marché s'y fie."""
        return self.statut == metier.STATUT_ACTIVE and self.quantite_dispo > 0


def chemin_photo(instance: "Photo", nom_fichier: str) -> str:
    """media/annonces/<id annonce>/<uuid>.webp — un dossier par annonce."""
    extension = nom_fichier.rsplit(".", 1)[-1].lower() if "." in nom_fichier else "webp"
    return f"annonces/{instance.annonce_id}/{uuid.uuid4().hex}.{extension}"


class Photo(models.Model):
    annonce = models.ForeignKey(
        Annonce,
        on_delete=models.CASCADE,
        related_name="photos",
        verbose_name="annonce",
    )
    image = models.ImageField("image", upload_to=chemin_photo, max_length=255)
    ordre = models.PositiveSmallIntegerField("ordre d'affichage", default=0)
    ajoutee_le = models.DateTimeField("ajoutée le", auto_now_add=True)

    class Meta:
        db_table = "annonce_photos"
        verbose_name = "photo"
        verbose_name_plural = "photos"
        ordering = ["ordre", "ajoutee_le"]

    def __str__(self) -> str:
        return f"Photo {self.ordre} de {self.annonce_id}"
