"""Filtres de gabarit propres à Digi-Farm.

    {{ annonce.prix|fcfa }}                 → « 1 500 FCFA »
    {{ annonce.prix|par_unite:annonce.unite }} → « 1 500 FCFA / kg »
    {{ annonce.quantite_dispo|stock:annonce.unite }} → « 100 kg »
"""

from django import template

from core import formatage

register = template.Library()


@register.filter(name="fcfa")
def filtre_fcfa(valeur) -> str:
    return formatage.fcfa(valeur)


@register.filter(name="nombre")
def filtre_nombre(valeur) -> str:
    return formatage.nombre_fr(valeur)


@register.filter(name="par_unite")
def filtre_par_unite(valeur, unite: str) -> str:
    """Prix affiché PAR UNITÉ de vente (kg, sac, tonne) — pas au kilo partout."""
    return f"{formatage.fcfa(valeur)} / {unite}"


@register.filter(name="stock")
def filtre_stock(valeur, unite: str) -> str:
    return formatage.stock(valeur, unite)


@register.filter(name="avec_erreurs")
def filtre_avec_erreurs(champ):
    """Rend un champ en le marquant invalide pour les lecteurs d'écran.

    Sans cela, un champ en erreur n'est signalé que visuellement (bordure
    rouge) : une personne qui navigue au clavier avec un lecteur d'écran ne
    saurait pas lequel corriger.
    """
    if not champ.errors:
        return champ
    return champ.as_widget(
        attrs={
            "aria-invalid": "true",
            "aria-describedby": f"{champ.auto_id}-erreur",
        }
    )


@register.filter(name="pourcentage")
def filtre_pourcentage(partie, total) -> int:
    """Part en pourcentage, bornée à 100. Pour les barres de progression."""
    try:
        if not total:
            return 0
        return min(100, round(100 * float(partie) / float(total)))
    except (TypeError, ValueError, ZeroDivisionError):
        return 0
