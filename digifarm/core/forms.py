"""Formulaire de contact."""

from django import forms

from .models import MessageContact

CLASSE_CHAMP = {"class": "champ"}


class ContactForm(forms.ModelForm):
    """Message envoyé depuis /contact/.

    Protection anti-robot par « pot de miel » : un champ invisible que seul un
    automate remplit. Pas de captcha, qui pénaliserait surtout les personnes peu
    à l'aise avec le numérique — c'est précisément notre public.
    """

    # Le nom est banal exprès : un robot le remplit, un humain ne le voit pas.
    site_web = forms.CharField(
        required=False,
        widget=forms.TextInput(
            attrs={
                "tabindex": "-1",
                "autocomplete": "off",
                "aria-hidden": "true",
                "class": "hidden",
            }
        ),
    )

    class Meta:
        model = MessageContact
        fields = ("nom", "email", "telephone", "sujet", "message")
        labels = {"email": "Adresse e-mail", "telephone": "Téléphone (facultatif)"}
        help_texts = {
            "telephone": "Si vous préférez qu'on vous rappelle.",
        }
        widgets = {
            "nom": forms.TextInput(
                attrs={**CLASSE_CHAMP, "autocomplete": "name", "placeholder": "Votre nom"}
            ),
            "email": forms.EmailInput(
                attrs={
                    **CLASSE_CHAMP,
                    "autocomplete": "email",
                    "inputmode": "email",
                    "placeholder": "vous@exemple.tg",
                }
            ),
            "telephone": forms.TextInput(
                attrs={
                    **CLASSE_CHAMP,
                    "autocomplete": "tel",
                    "inputmode": "tel",
                    "placeholder": "+228 90 00 00 00",
                }
            ),
            "sujet": forms.Select(attrs=CLASSE_CHAMP),
            "message": forms.Textarea(
                attrs={
                    **CLASSE_CHAMP,
                    "rows": 6,
                    "placeholder": "Expliquez-nous en quelques lignes…",
                }
            ),
        }

    def clean_site_web(self) -> str:
        if self.cleaned_data.get("site_web"):
            raise forms.ValidationError("Envoi refusé.")
        return ""

    def clean_message(self) -> str:
        message = self.cleaned_data["message"].strip()
        if len(message) < 10:
            raise forms.ValidationError(
                "Donnez un peu plus de détails (10 caractères minimum)."
            )
        return message
