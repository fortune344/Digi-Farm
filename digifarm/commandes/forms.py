"""Formulaires du tunnel de commande."""

from decimal import Decimal

from django import forms

from core import metier

CLASSE_CHAMP = {"class": "champ"}


class CommanderForm(forms.Form):
    """Quantité et mode de livraison.

    Le PRIX n'est pas un champ : il est relu en base au moment de créer la
    commande. Le client ne peut donc pas négocier son propre total.
    """

    quantite = forms.DecimalField(
        label="Quantité",
        min_value=Decimal("0.01"),
        max_digits=10,
        decimal_places=2,
        widget=forms.NumberInput(
            attrs={**CLASSE_CHAMP, "step": "0.01", "inputmode": "decimal"}
        ),
    )
    mode_livraison = forms.ChoiceField(
        label="Livraison",
        choices=metier.MODES_LIVRAISON,
        widget=forms.RadioSelect,
    )
    adresse = forms.CharField(
        label="Adresse de livraison",
        required=False,
        widget=forms.Textarea(
            attrs={
                **CLASSE_CHAMP,
                "rows": 3,
                "placeholder": "Quartier, ville, point de repère…",
            }
        ),
    )

    def __init__(self, *args, annonce=None, **kwargs):
        self.annonce = annonce
        super().__init__(*args, **kwargs)
        if annonce is not None:
            self.fields["quantite"].max_value = annonce.quantite_dispo
            self.fields["quantite"].widget.attrs["max"] = str(annonce.quantite_dispo)
            self.fields["quantite"].help_text = (
                f"Disponible : {annonce.quantite_dispo} {annonce.unite}"
            )

    def clean_quantite(self) -> Decimal:
        quantite = self.cleaned_data["quantite"]
        if self.annonce and quantite > self.annonce.quantite_dispo:
            raise forms.ValidationError(
                f"Il ne reste que {self.annonce.quantite_dispo} "
                f"{self.annonce.unite} en stock."
            )
        return quantite

    def clean(self):
        donnees = super().clean()
        # Une livraison par transporteur sans adresse n'est pas livrable.
        if donnees.get("mode_livraison") == "transporteur" and not (
            donnees.get("adresse") or ""
        ).strip():
            self.add_error(
                "adresse",
                "Indiquez une adresse pour une livraison par transporteur.",
            )
        return donnees


class LitigeForm(forms.Form):
    motif = forms.CharField(
        label="Que s'est-il passé ?",
        widget=forms.Textarea(
            attrs={
                **CLASSE_CHAMP,
                "rows": 3,
                "placeholder": "Produit non conforme, colis non reçu…",
            }
        ),
    )
