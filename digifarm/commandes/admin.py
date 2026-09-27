"""Administration des commandes et paiements.

Précaution volontaire : le statut du séquestre et le journal d'audit sont en
LECTURE SEULE ici. Modifier `statut_sequestre` à la main contournerait la machine
à états et la piste d'audit — c'est-à-dire la garantie que l'argent ne bouge que
pour une raison tracée (règle n°5). La résolution de litige passera par une
action d'administration dédiée (Phase 8), qui écrira dans le journal.
"""

from django.contrib import admin

from .models import Commande, JournalPaiement, LigneCommande, Paiement


class LigneCommandeInline(admin.TabularInline):
    model = LigneCommande
    extra = 0
    fields = ("titre", "prix_unitaire", "quantite", "annonce")
    readonly_fields = fields  # instantané figé à l'achat : on n'y touche pas
    can_delete = False


class JournalInline(admin.TabularInline):
    model = JournalPaiement
    extra = 0
    fields = ("cree_le", "statut_depart", "statut_arrivee", "acteur", "montant", "note")
    readonly_fields = fields
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Commande)
class CommandeAdmin(admin.ModelAdmin):
    list_display = (
        "reference_courte",
        "statut",
        "total",
        "acheteur",
        "agriculteur",
        "sequestre",
        "cree_le",
    )
    list_filter = ("statut", "mode_livraison", "cree_le")
    search_fields = ("id", "acheteur__profil__nom", "agriculteur__profil__nom")
    readonly_fields = ("id", "total", "cree_le", "modifie_le")
    inlines = [LigneCommandeInline]
    date_hierarchy = "cree_le"
    list_select_related = ("paiement", "acheteur__profil", "agriculteur__profil")

    @admin.display(description="séquestre")
    def sequestre(self, obj):
        paiement = getattr(obj, "paiement", None)
        return paiement.get_statut_sequestre_display() if paiement else "—"


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    """Consultation seule : aucune écriture directe sur l'argent."""

    list_display = (
        "ref_agregateur",
        "montant",
        "frais_commission",
        "montant_net_vendeur",
        "statut_sequestre",
        "methode",
        "cree_le",
    )
    list_filter = ("statut_sequestre", "methode")
    search_fields = ("ref_agregateur", "commande__id")
    inlines = [JournalInline]

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="net vendeur")
    def montant_net_vendeur(self, obj):
        return obj.montant_net_vendeur


@admin.register(JournalPaiement)
class JournalPaiementAdmin(admin.ModelAdmin):
    """Piste d'audit : on lit, on n'écrit jamais."""

    list_display = ("cree_le", "paiement", "statut_depart", "statut_arrivee", "acteur", "montant")
    list_filter = ("statut_arrivee", "acteur")
    search_fields = ("paiement__ref_agregateur", "note")
    date_hierarchy = "cree_le"

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
