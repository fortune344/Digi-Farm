"""Vues des annonces : marché public, détail, et gestion par l'agriculteur.

Autorisation : les vues de gestion exigent le rôle agriculteur ET la propriété
de l'annonce (règle n°1). Le marché et le détail sont publics en lecture.
"""

from django.contrib import messages
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_http_methods, require_POST

from core import metier
from core.autorisation import agriculteur_requis, objet_possede_par

from .forms import AnnonceForm
from .models import Annonce, Photo

# Pagination : 12 annonces par page, pour ne pas charger 200 photos sur un
# forfait data limité (règle n°6).
PAR_PAGE = 12


def accueil(request):
    """Page d'accueil éditoriale. Un aperçu du marché, pas le catalogue entier."""
    recentes = (
        Annonce.objects.publiables()
        .select_related("agriculteur__profil")
        .prefetch_related("photos")[:6]
    )
    return render(
        request,
        "annonces/accueil.html",
        {
            "recentes": recentes,
            "nb_annonces": Annonce.objects.publiables().count(),
            "categories": metier.CATEGORIES,
        },
    )


def marche(request):
    """Catalogue public, filtrable et paginé.

    Les filtres passent par l'URL (?q=&categorie=&region=) pour que la page
    reste partageable et que le bouton « retour » du navigateur fonctionne.
    """
    recherche = (request.GET.get("q") or "").strip()
    categorie = request.GET.get("categorie") or ""
    region = request.GET.get("region") or ""
    tri = request.GET.get("tri") or "recent"

    annonces = (
        Annonce.objects.publiables()
        .select_related("agriculteur__profil")
        .prefetch_related("photos")
    )

    if recherche:
        annonces = annonces.filter(
            Q(titre__icontains=recherche) | Q(description__icontains=recherche)
        )
    # On ne filtre que sur des valeurs connues : un paramètre fantaisiste est ignoré.
    if categorie in dict(metier.CATEGORIES):
        annonces = annonces.filter(categorie=categorie)
    if region in dict(metier.REGIONS):
        annonces = annonces.filter(region=region)

    tris = {
        "recent": "-cree_le",
        "prix_croissant": "prix",
        "prix_decroissant": "-prix",
    }
    annonces = annonces.order_by(tris.get(tri, "-cree_le"))

    total = annonces.count()
    page = max(1, int(request.GET.get("page") or 1))
    debut = (page - 1) * PAR_PAGE
    resultats = list(annonces[debut : debut + PAR_PAGE])
    nb_pages = max(1, -(-total // PAR_PAGE))  # division entière arrondie au-dessus

    # Paramètres à reporter dans les liens de pagination, sans le numéro de page.
    parametres = request.GET.copy()
    parametres.pop("page", None)

    return render(
        request,
        "annonces/marche.html",
        {
            "annonces": resultats,
            "total": total,
            "page": page,
            "nb_pages": nb_pages,
            "page_precedente": page - 1 if page > 1 else None,
            "page_suivante": page + 1 if page < nb_pages else None,
            "recherche": recherche,
            "categorie_active": categorie,
            "region_active": region,
            "tri_actif": tri,
            "categories": metier.CATEGORIES,
            "regions": metier.REGIONS,
            "parametres": parametres.urlencode(),
            "filtres_actifs": bool(recherche or categorie or region),
        },
    )


def detail(request, pk):
    """Fiche produit publique."""
    annonce = get_object_or_404(
        Annonce.objects.select_related("agriculteur__profil").prefetch_related("photos"),
        pk=pk,
    )

    # Une annonce suspendue n'est visible que par son propriétaire.
    if annonce.statut == metier.STATUT_SUSPENDUE and (
        not request.user.is_authenticated or annonce.agriculteur_id != request.user.pk
    ):
        from django.http import Http404

        raise Http404("Annonce introuvable.")

    autres = (
        Annonce.objects.publiables()
        .filter(agriculteur_id=annonce.agriculteur_id)
        .exclude(pk=annonce.pk)
        .prefetch_related("photos")[:3]
    )

    # Un agriculteur ne peut pas acheter sa propre production (anti auto-achat).
    est_le_vendeur = (
        request.user.is_authenticated and annonce.agriculteur_id == request.user.pk
    )

    return render(
        request,
        "annonces/detail.html",
        {"annonce": annonce, "autres": autres, "est_le_vendeur": est_le_vendeur},
    )


def _enregistrer_photos(annonce: Annonce, fichiers: list) -> None:
    """Attache les photos compressées à l'annonce, en conservant leur ordre."""
    depart = annonce.photos.count()
    for index, fichier in enumerate(fichiers):
        Photo.objects.create(annonce=annonce, image=fichier, ordre=depart + index)


@agriculteur_requis
@require_http_methods(["GET", "POST"])
def nouvelle(request):
    formulaire = AnnonceForm(request.POST or None, request.FILES or None)
    if request.method == "POST" and formulaire.is_valid():
        with transaction.atomic():
            annonce = formulaire.save(commit=False)
            # Le propriétaire vient de la session, jamais du formulaire.
            annonce.agriculteur = request.user
            annonce.region = formulaire.cleaned_data["region"]
            annonce.save()
            _enregistrer_photos(annonce, formulaire.cleaned_data["photos"])
        messages.success(request, "Votre annonce est publiée.")
        return redirect("comptes:tableau_de_bord")

    return render(
        request,
        "annonces/formulaire.html",
        {"formulaire": formulaire, "annonce": None},
    )


@agriculteur_requis
@require_http_methods(["GET", "POST"])
def modifier(request, pk):
    annonce = objet_possede_par(
        get_object_or_404(Annonce.objects.prefetch_related("photos"), pk=pk),
        request.user,
    )

    formulaire = AnnonceForm(request.POST or None, request.FILES or None, instance=annonce)
    if request.method == "POST" and formulaire.is_valid():
        with transaction.atomic():
            annonce = formulaire.save()
            _enregistrer_photos(annonce, formulaire.cleaned_data["photos"])
            # Supprimer une photo : cases cochées dans le formulaire.
            a_supprimer = request.POST.getlist("photo_supprimee")
            if a_supprimer:
                for photo in annonce.photos.filter(pk__in=a_supprimer):
                    photo.image.delete(save=False)  # le fichier aussi, pas que la ligne
                    photo.delete()
        messages.success(request, "Annonce mise à jour.")
        return redirect("comptes:tableau_de_bord")

    return render(
        request,
        "annonces/formulaire.html",
        {"formulaire": formulaire, "annonce": annonce},
    )


@agriculteur_requis
@require_POST
def supprimer(request, pk):
    annonce = objet_possede_par(get_object_or_404(Annonce, pk=pk), request.user)
    titre = annonce.titre
    with transaction.atomic():
        for photo in annonce.photos.all():
            photo.image.delete(save=False)
        annonce.delete()
    messages.success(request, f"« {titre} » a été supprimée.")
    return redirect("comptes:tableau_de_bord")


@agriculteur_requis
@require_POST
def basculer_statut(request, pk):
    """Suspend une annonce active, ou remet en ligne une annonce suspendue.

    Une annonce épuisée (stock à zéro) ne se remet pas en ligne d'un clic : il
    faut d'abord remettre du stock, donc passer par le formulaire.
    """
    annonce = objet_possede_par(get_object_or_404(Annonce, pk=pk), request.user)

    if annonce.statut == metier.STATUT_ACTIVE:
        annonce.statut = metier.STATUT_SUSPENDUE
        annonce.save(update_fields=["statut", "modifie_le"])
        messages.success(request, f"« {annonce.titre} » est retirée du marché.")
    elif annonce.quantite_dispo <= 0:
        messages.error(
            request,
            "Cette annonce est épuisée : renseignez d'abord une quantité disponible.",
        )
    else:
        annonce.statut = metier.STATUT_ACTIVE
        annonce.save(update_fields=["statut", "modifie_le"])
        messages.success(request, f"« {annonce.titre} » est de nouveau en ligne.")

    return redirect("comptes:tableau_de_bord")
