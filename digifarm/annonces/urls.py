from django.urls import path

from . import views

app_name = "annonces"

urlpatterns = [
    path("", views.accueil, name="accueil"),
    path("marche/", views.marche, name="marche"),
    path("annonces/nouvelle/", views.nouvelle, name="nouvelle"),
    path("annonces/<uuid:pk>/modifier/", views.modifier, name="modifier"),
    path("annonces/<uuid:pk>/supprimer/", views.supprimer, name="supprimer"),
    path("annonces/<uuid:pk>/statut/", views.basculer_statut, name="basculer_statut"),
    # Le détail public vient en dernier : il ne doit pas capturer les routes ci-dessus.
    path("produits/<uuid:pk>/", views.detail, name="detail"),
]
