"""Profil métier lié 1-1 à l'utilisateur Django.

L'authentification (mot de passe, session) est assurée par django.contrib.auth.
Ce modèle porte ce qui est propre à Digi-Farm : le RÔLE, le nom, la région.

Le rôle vit ICI, côté serveur, et n'est jamais lu depuis une donnée envoyée par
le client (règle n°2 — voir docs/blueprints/autorisation.md).
"""

from django.conf import settings
from django.db import models

from core import metier


class Profil(models.Model):
    utilisateur = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profil",
        verbose_name="utilisateur",
    )
    role = models.CharField("rôle", max_length=20, choices=metier.ROLES)
    nom = models.CharField("nom complet", max_length=120)
    telephone = models.CharField("téléphone", max_length=30, blank=True)
    region = models.CharField("région", max_length=20, choices=metier.REGIONS)
    verifie = models.BooleanField("vérifié", default=False)
    note_moyenne = models.DecimalField(
        "note moyenne", max_digits=3, decimal_places=2, default=0
    )
    cree_le = models.DateTimeField("créé le", auto_now_add=True)

    class Meta:
        db_table = "profils"
        verbose_name = "profil"
        verbose_name_plural = "profils"
        ordering = ["nom"]

    def __str__(self) -> str:
        return f"{self.nom} ({self.get_role_display()})"

    @property
    def est_agriculteur(self) -> bool:
        return self.role == metier.ROLE_AGRICULTEUR

    @property
    def est_acheteur(self) -> bool:
        return self.role == metier.ROLE_ACHETEUR

    @property
    def est_admin(self) -> bool:
        return self.role == metier.ROLE_ADMIN

    @property
    def prenom(self) -> str:
        """Premier mot du nom, pour les salutations (« Bonjour Kodjo »)."""
        return self.nom.split(" ")[0] if self.nom else ""
