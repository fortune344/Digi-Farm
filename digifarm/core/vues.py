"""Pages institutionnelles : à propos, contact, FAQ, mentions légales.

Ces pages n'ont rien de décoratif : un acheteur qui hésite à payer en ligne
cherche d'abord à savoir qui est derrière le site et ce qui se passe si la
livraison tourne mal.
"""

from django.contrib import messages
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods

from annonces.models import Annonce
from comptes.models import Profil
from core import metier

from .forms import ContactForm


def _chiffres_du_site() -> dict:
    """Quelques chiffres réels — jamais inventés : s'il n'y a que 3 annonces,
    la page affichera 3."""
    return {
        "nb_annonces": Annonce.objects.publiables().count(),
        "nb_vendeurs": Profil.objects.filter(role=metier.ROLE_AGRICULTEUR).count(),
        "nb_regions": len(metier.REGIONS),
        "commission": int(metier.TAUX_COMMISSION * 100),
    }


def a_propos(request):
    return render(request, "pages/a_propos.html", _chiffres_du_site())


@require_http_methods(["GET", "POST"])
def contact(request):
    initial = {}
    if request.user.is_authenticated:
        profil = getattr(request.user, "profil", None)
        initial = {
            "nom": profil.nom if profil else "",
            "email": request.user.email,
            "telephone": profil.telephone if profil else "",
        }

    formulaire = ContactForm(request.POST or None, initial=initial)
    if request.method == "POST" and formulaire.is_valid():
        message = formulaire.save(commit=False)
        if request.user.is_authenticated:
            message.auteur = request.user
        message.save()
        messages.success(
            request,
            "Votre message est bien arrivé. Nous vous répondons sous 48 heures.",
        )
        return redirect("core:contact")

    return render(request, "pages/contact.html", {"formulaire": formulaire})


def faq(request):
    return render(request, "pages/faq.html", {"commission": int(metier.TAUX_COMMISSION * 100)})


def conditions(request):
    return render(request, "pages/conditions.html", {"commission": int(metier.TAUX_COMMISSION * 100)})


def confidentialite(request):
    return render(request, "pages/confidentialite.html")
