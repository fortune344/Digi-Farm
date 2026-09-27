"""Formulaires d'annonce.

Remplace les schémas zod + les server actions de la version Next : un seul
endroit pour la validation, le rendu et les messages d'erreur.
"""

from django import forms

from core import metier

from .models import Annonce
from .photos import PhotoInvalide, compresser

CLASSE_CHAMP = {"class": "champ"}


class WidgetFichiersMultiples(forms.ClearableFileInput):
    """Le widget de base refuse `multiple` tant qu'on ne l'autorise pas
    explicitement : c'est le garde-fou de Django contre les uploads multiples
    involontaires."""

    allow_multiple_selected = True


class ChampFichiersMultiples(forms.FileField):
    """Upload de plusieurs fichiers.

    Depuis Django 5, un champ fichier multiple se déclare ainsi (motif
    recommandé par la documentation officielle).
    """

    widget = WidgetFichiersMultiples(
        attrs={"multiple": True, "accept": "image/*", "class": "champ"}
    )

    def clean(self, data, initial=None):
        nettoyer_un = super().clean
        if isinstance(data, (list, tuple)):
            return [nettoyer_un(fichier, initial) for fichier in data]
        return [nettoyer_un(data, initial)] if data else []


class AnnonceForm(forms.ModelForm):
    """Création et modification d'une annonce.

    `agriculteur` n'est PAS un champ du formulaire : le propriétaire est imposé
    par la vue depuis la session (règle n°9 — jamais de confiance au client).
    """

    photos = ChampFichiersMultiples(
        label="Photos du produit",
        required=False,
        help_text=(
            f"{metier.MAX_PHOTOS} photos maximum. Elles sont compressées "
            "automatiquement pour rester légères à afficher."
        ),
    )

    class Meta:
        model = Annonce
        fields = (
            "titre",
            "categorie",
            "description",
            "prix",
            "unite",
            "quantite_dispo",
            "region",
            "statut",
        )
        labels = {
            "titre": "Titre de l'annonce",
            "prix": "Prix",
            "quantite_dispo": "Quantité disponible",
            "statut": "Visibilité",
        }
        help_texts = {
            "titre": "Soyez précis : « Maïs blanc séché, récolte 2026 ».",
            "prix": "En FCFA, pour une seule unité de vente.",
            "quantite_dispo": "Ce que vous avez réellement en stock.",
        }
        widgets = {
            "titre": forms.TextInput(
                attrs={**CLASSE_CHAMP, "placeholder": "Maïs blanc séché, récolte 2026"}
            ),
            "categorie": forms.Select(attrs=CLASSE_CHAMP),
            "description": forms.Textarea(
                attrs={
                    **CLASSE_CHAMP,
                    "rows": 5,
                    "placeholder": "Variété, qualité, conditions de retrait…",
                }
            ),
            "prix": forms.NumberInput(
                attrs={**CLASSE_CHAMP, "min": 1, "step": 1, "inputmode": "numeric"}
            ),
            "unite": forms.Select(attrs=CLASSE_CHAMP),
            "quantite_dispo": forms.NumberInput(
                attrs={**CLASSE_CHAMP, "min": 0, "step": "0.01", "inputmode": "decimal"}
            ),
            "region": forms.Select(attrs=CLASSE_CHAMP),
            "statut": forms.Select(attrs=CLASSE_CHAMP),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # « Épuisée » est dérivé du stock, on ne le propose pas au choix.
        self.fields["statut"].choices = metier.STATUTS_ANNONCE_EDITABLES
        # Le nombre de photos déjà en place borne ce qu'on peut encore ajouter.
        self.photos_existantes = (
            self.instance.photos.count() if self.instance.pk else 0
        )

    def clean_prix(self) -> int:
        prix = self.cleaned_data["prix"]
        if prix < 1:
            raise forms.ValidationError("Le prix doit être supérieur à zéro.")
        return prix

    def clean_quantite_dispo(self):
        quantite = self.cleaned_data["quantite_dispo"]
        if quantite < 0:
            raise forms.ValidationError("La quantité ne peut pas être négative.")
        return quantite

    def clean_photos(self) -> list:
        fichiers = self.cleaned_data.get("photos") or []
        place_restante = metier.MAX_PHOTOS - self.photos_existantes
        if len(fichiers) > place_restante:
            raise forms.ValidationError(
                f"Vous ne pouvez ajouter que {place_restante} photo(s) de plus "
                f"({metier.MAX_PHOTOS} au total)."
            )

        compressees = []
        for fichier in fichiers:
            try:
                compressees.append(compresser(fichier))
            except PhotoInvalide as erreur:
                raise forms.ValidationError(str(erreur)) from erreur
        return compressees
