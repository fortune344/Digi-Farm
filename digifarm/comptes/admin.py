from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from .models import Profil


class ProfilInline(admin.StackedInline):
    model = Profil
    can_delete = False
    verbose_name_plural = "profil Digi-Farm"
    fields = ("role", "nom", "telephone", "region", "verifie", "note_moyenne")
    readonly_fields = ("note_moyenne",)  # calculée depuis les avis, pas saisie


class UserAdmin(BaseUserAdmin):
    """Utilisateur Django + son profil métier sur la même page."""

    inlines = [ProfilInline]
    list_display = ("username", "email", "profil_nom", "profil_role", "is_staff")
    list_select_related = ("profil",)

    @admin.display(description="nom", ordering="profil__nom")
    def profil_nom(self, obj):
        return getattr(obj.profil, "nom", "—") if hasattr(obj, "profil") else "—"

    @admin.display(description="rôle", ordering="profil__role")
    def profil_role(self, obj):
        return obj.profil.get_role_display() if hasattr(obj, "profil") else "—"


admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(Profil)
class ProfilAdmin(admin.ModelAdmin):
    list_display = ("nom", "role", "region", "verifie", "cree_le")
    list_filter = ("role", "region", "verifie")
    search_fields = ("nom", "telephone", "utilisateur__email")
    autocomplete_fields = ("utilisateur",)


admin.site.site_header = "Administration Digi-Farm"
admin.site.site_title = "Digi-Farm"
admin.site.index_title = "Modération et suivi"
