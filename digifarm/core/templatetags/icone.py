"""Balise {% icone %} : insère une icône SVG en ligne.

    {% icone "truck" %}                      décorative (aria-hidden)
    {% icone "truck" classe="size-5" %}      taille personnalisée
    {% icone "truck" titre="Livraison" %}    porteuse de sens → role="img" + <title>

Une icône décorative est masquée aux lecteurs d'écran ; une icône qui porte
l'information reçoit un titre lisible. Jamais d'emoji en guise d'icône.
"""

from django import template
from django.utils.html import escape
from django.utils.safestring import mark_safe

from core.icones import ICONES

register = template.Library()


@register.simple_tag(name="icone")
def icone(nom: str, classe: str = "size-4", titre: str = "") -> str:
    tracé = ICONES.get(nom)
    if tracé is None:
        # Nom inconnu : on échoue visiblement en développement plutôt que de
        # laisser un trou silencieux dans l'interface.
        raise template.TemplateSyntaxError(
            f"Icône inconnue : « {nom} ». "
            f"Ajoutez-la dans scripts/extraire-icones.mjs puis régénérez."
        )

    if titre:
        accessibilite = f'role="img" aria-label="{escape(titre)}"'
        contenu = f"<title>{escape(titre)}</title>{tracé}"
    else:
        accessibilite = 'aria-hidden="true" focusable="false"'
        contenu = tracé

    return mark_safe(  # noqa: S308 — tracés issus d'un registre généré, pas d'une saisie
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" '
        f'fill="none" stroke="currentColor" stroke-width="2" '
        f'stroke-linecap="round" stroke-linejoin="round" '
        f'class="{escape(classe)}" {accessibilite}>{contenu}</svg>'
    )
