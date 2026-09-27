"""Formulaires de compte.

Les formulaires Django font la validation ET le rendu ET les messages d'erreur
au même endroit — c'est ce qui remplace les schémas zod de la version Next.

Choix : l'adresse e-mail sert d'identifiant de connexion. On la recopie dans
`username` (le validateur Django accepte @ . + - _) et on la normalise en
minuscules, pour que « Kodjo@Example.com » et « kodjo@example.com » soient le
même compte.
"""

from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password

from core import metier

from .models import Profil

CLASSE_CHAMP = {"class": "champ"}


class InscriptionForm(forms.Form):
    """Crée l'utilisateur ET son profil. Le rôle est choisi ici, une fois."""

    nom = forms.CharField(
        label="Nom complet",
        max_length=120,
        widget=forms.TextInput(
            attrs={**CLASSE_CHAMP, "autocomplete": "name", "placeholder": "Kodjo Mensah"}
        ),
    )
    email = forms.EmailField(
        label="Adresse e-mail",
        widget=forms.EmailInput(
            attrs={
                **CLASSE_CHAMP,
                "autocomplete": "email",
                "inputmode": "email",
                "placeholder": "vous@exemple.tg",
            }
        ),
    )
    telephone = forms.CharField(
        label="Téléphone",
        max_length=30,
        required=False,
        help_text="Pour que l'acheteur ou le vendeur puisse vous joindre.",
        widget=forms.TextInput(
            attrs={
                **CLASSE_CHAMP,
                "autocomplete": "tel",
                "inputmode": "tel",
                "placeholder": "+228 90 00 00 00",
            }
        ),
    )
    role = forms.ChoiceField(
        label="Je suis",
        choices=metier.ROLES_INSCRIPTION,
        widget=forms.RadioSelect,
        help_text="L'agriculteur publie des annonces, l'acheteur commande.",
    )
    region = forms.ChoiceField(
        label="Région",
        choices=metier.REGIONS,
        widget=forms.Select(attrs=CLASSE_CHAMP),
    )
    mot_de_passe = forms.CharField(
        label="Mot de passe",
        widget=forms.PasswordInput(
            attrs={**CLASSE_CHAMP, "autocomplete": "new-password"}
        ),
        help_text="8 caractères minimum.",
    )

    def clean_email(self) -> str:
        email = self.cleaned_data["email"].strip().lower()
        if User.objects.filter(username__iexact=email).exists() or (
            User.objects.filter(email__iexact=email).exists()
        ):
            raise forms.ValidationError("Un compte existe déjà avec cette adresse.")
        return email

    def clean_mot_de_passe(self) -> str:
        mot_de_passe = self.cleaned_data["mot_de_passe"]
        validate_password(mot_de_passe)
        return mot_de_passe

    def enregistrer(self) -> User:
        """Crée l'utilisateur et son profil. À appeler dans une transaction."""
        donnees = self.cleaned_data
        utilisateur = User.objects.create_user(
            username=donnees["email"],
            email=donnees["email"],
            password=donnees["mot_de_passe"],
            first_name=donnees["nom"].split(" ")[0][:150],
        )
        Profil.objects.create(
            utilisateur=utilisateur,
            role=donnees["role"],
            nom=donnees["nom"],
            telephone=donnees["telephone"],
            region=donnees["region"],
        )
        return utilisateur


class ConnexionForm(forms.Form):
    email = forms.EmailField(
        label="Adresse e-mail",
        widget=forms.EmailInput(
            attrs={
                **CLASSE_CHAMP,
                "autocomplete": "email",
                "inputmode": "email",
                "autofocus": True,
            }
        ),
    )
    mot_de_passe = forms.CharField(
        label="Mot de passe",
        widget=forms.PasswordInput(
            attrs={**CLASSE_CHAMP, "autocomplete": "current-password"}
        ),
    )

    def __init__(self, *args, request=None, **kwargs):
        self.request = request
        self.utilisateur = None
        super().__init__(*args, **kwargs)

    def clean(self):
        donnees = super().clean()
        email = (donnees.get("email") or "").strip().lower()
        mot_de_passe = donnees.get("mot_de_passe")
        if email and mot_de_passe:
            self.utilisateur = authenticate(
                self.request, username=email, password=mot_de_passe
            )
            if self.utilisateur is None:
                # Message volontairement identique pour un e-mail inconnu et un
                # mauvais mot de passe : ne pas révéler quels comptes existent.
                raise forms.ValidationError("E-mail ou mot de passe incorrect.")
            if not self.utilisateur.is_active:
                raise forms.ValidationError("Ce compte a été désactivé.")
        return donnees


class ProfilForm(forms.ModelForm):
    """Modification du profil. Le RÔLE n'y figure pas : il ne se change pas
    depuis l'interface (règle n°2), seul un administrateur peut le faire."""

    class Meta:
        model = Profil
        fields = ("nom", "telephone", "region")
        widgets = {
            "nom": forms.TextInput(attrs={**CLASSE_CHAMP, "autocomplete": "name"}),
            "telephone": forms.TextInput(
                attrs={**CLASSE_CHAMP, "autocomplete": "tel", "inputmode": "tel"}
            ),
            "region": forms.Select(attrs=CLASSE_CHAMP),
        }
