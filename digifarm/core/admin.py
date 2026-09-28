from django.contrib import admin

from .models import MessageContact


@admin.register(MessageContact)
class MessageContactAdmin(admin.ModelAdmin):
    """Boîte de réception du formulaire de contact.

    Le contenu du message est en lecture seule : on répond, on marque traité,
    on ne réécrit pas ce que la personne a envoyé.
    """

    list_display = ("nom", "sujet", "email", "telephone", "traite", "cree_le")
    list_filter = ("traite", "sujet", "cree_le")
    search_fields = ("nom", "email", "telephone", "message")
    list_editable = ("traite",)
    date_hierarchy = "cree_le"
    readonly_fields = ("id", "nom", "email", "telephone", "sujet", "message", "auteur", "cree_le")
    fields = ("nom", "email", "telephone", "sujet", "message", "auteur", "cree_le", "traite")

    def has_add_permission(self, request):
        return False
