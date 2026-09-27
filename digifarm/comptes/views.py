"""Vues de compte : inscription, connexion, déconnexion, profil, tableau de bord.

Chaque vue qui touche des données vérifie la session côté serveur.
"""

from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import HttpResponseNotAllowed
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.decorators.http import require_http_methods

from core.autorisation import profil_de

from .forms import ConnexionForm, InscriptionForm, ProfilForm


@require_http_methods(["GET", "POST"])
def inscription(request):
    if request.user.is_authenticated:
        return redirect("comptes:tableau_de_bord")

    formulaire = InscriptionForm(request.POST or None)
    if request.method == "POST" and formulaire.is_valid():
        # Utilisateur et profil créés ensemble : jamais l'un sans l'autre.
        with transaction.atomic():
            utilisateur = formulaire.enregistrer()
        login(request, utilisateur)
        messages.success(request, "Votre compte est créé. Bienvenue sur Digi-Farm.")
        return redirect("comptes:tableau_de_bord")

    return render(request, "comptes/inscription.html", {"formulaire": formulaire})


@require_http_methods(["GET", "POST"])
def connexion(request):
    if request.user.is_authenticated:
        return redirect("comptes:tableau_de_bord")

    formulaire = ConnexionForm(request.POST or None, request=request)
    if request.method == "POST" and formulaire.is_valid():
        login(request, formulaire.utilisateur)
        profil_utilisateur = profil_de(formulaire.utilisateur)
        prenom = profil_utilisateur.prenom if profil_utilisateur else ""
        salutation = "Content de vous revoir"
        if prenom:
            salutation = f"{salutation}, {prenom}"
        messages.success(request, f"{salutation}.")

        # `next` n'est suivi que s'il reste sur le site (pas de redirection ouverte).
        suivant = request.POST.get("next") or request.GET.get("next")
        if suivant and suivant.startswith("/") and not suivant.startswith("//"):
            return redirect(suivant)
        return redirect("comptes:tableau_de_bord")

    return render(
        request,
        "comptes/connexion.html",
        {"formulaire": formulaire, "suivant": request.GET.get("next", "")},
    )


def deconnexion(request):
    """Déconnexion en POST uniquement : un GET ne doit pas pouvoir déconnecter
    quelqu'un depuis une image ou un lien piégé."""
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])
    logout(request)
    messages.success(request, "Vous êtes déconnecté.")
    return redirect("annonces:accueil")


@login_required
@require_http_methods(["GET", "POST"])
def profil(request):
    profil_utilisateur = profil_de(request.user)
    if profil_utilisateur is None:
        messages.error(request, "Aucun profil n'est associé à ce compte.")
        return redirect("annonces:accueil")

    formulaire = ProfilForm(request.POST or None, instance=profil_utilisateur)
    if request.method == "POST" and formulaire.is_valid():
        formulaire.save()
        messages.success(request, "Profil mis à jour.")
        return redirect("comptes:profil")

    return render(
        request,
        "comptes/profil.html",
        {"formulaire": formulaire, "profil_utilisateur": profil_utilisateur},
    )


@login_required
def tableau_de_bord(request):
    """Aiguillage par rôle — chacun voit son tableau de bord.

    Le rôle vient du profil en base, jamais de l'URL ou d'un paramètre.
    """
    profil_utilisateur = profil_de(request.user)
    if profil_utilisateur is None:
        messages.error(request, "Aucun profil n'est associé à ce compte.")
        return redirect("annonces:accueil")

    if profil_utilisateur.est_admin:
        return redirect(reverse("admin:index"))

    from .tableaux import vue_acheteur, vue_vendeur

    if profil_utilisateur.est_agriculteur:
        return vue_vendeur(request, profil_utilisateur)
    return vue_acheteur(request, profil_utilisateur)
