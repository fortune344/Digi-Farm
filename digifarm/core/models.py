"""Modèles du socle : pour l'instant, les messages envoyés depuis /contact/."""

import uuid

from django.conf import settings
from django.db import models


class MessageContact(models.Model):
    """Message reçu via le formulaire de contact.

    Enregistré en base et consultable dans l'administration, plutôt qu'envoyé
    par courriel : il n'y a pas encore de serveur SMTP configuré, et un message
    stocké ne se perd pas. Le jour où l'envoi d'e-mails existe, on ajoutera une
    notification — sans changer ce qui est déjà là.
    """

    SUJETS = [
        ("vendre", "Je veux vendre mes produits"),
        ("acheter", "Je veux acheter"),
        ("commande", "Question sur une commande"),
        ("paiement", "Question sur un paiement"),
        ("autre", "Autre"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom = models.CharField("nom", max_length=120)
    email = models.EmailField("adresse e-mail")
    telephone = models.CharField("téléphone", max_length=30, blank=True)
    sujet = models.CharField("sujet", max_length=20, choices=SUJETS, default="autre")
    message = models.TextField("message")
    # Renseigné si la personne était connectée : évite de lui redemander qui elle est.
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="messages_contact",
        verbose_name="compte",
    )
    traite = models.BooleanField("traité", default=False)
    cree_le = models.DateTimeField("reçu le", auto_now_add=True)

    class Meta:
        db_table = "messages_contact"
        verbose_name = "message de contact"
        verbose_name_plural = "messages de contact"
        ordering = ["traite", "-cree_le"]

    def __str__(self) -> str:
        return f"{self.nom} — {self.get_sujet_display()}"
