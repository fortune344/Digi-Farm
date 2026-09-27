from django.contrib import admin
from django.utils.html import format_html

from .models import Annonce, Photo


class PhotoInline(admin.TabularInline):
    model = Photo
    extra = 0
    fields = ("apercu", "image", "ordre")
    readonly_fields = ("apercu",)

    @admin.display(description="aperçu")
    def apercu(self, obj):
        if not obj.image:
            return "—"
        return format_html(
            '<img src="{}" style="height:56px;border-radius:6px" alt="" />',
            obj.image.url,
        )


@admin.register(Annonce)
class AnnonceAdmin(admin.ModelAdmin):
    """Modération des annonces : l'admin peut suspendre, pas réécrire les prix."""

    list_display = ("titre", "agriculteur", "categorie", "prix", "unite", "quantite_dispo", "region", "statut")
    list_filter = ("statut", "categorie", "region")
    search_fields = ("titre", "description", "agriculteur__profil__nom")
    autocomplete_fields = ("agriculteur",)
    inlines = [PhotoInline]
    readonly_fields = ("id", "cree_le", "modifie_le")
    list_per_page = 30
