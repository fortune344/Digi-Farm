from django.urls import path

from . import views

app_name = "commandes"

urlpatterns = [
    path("commander/<uuid:annonce_pk>/", views.commander, name="commander"),
    path("paiement/simule/<uuid:ref>/", views.paiement_simule, name="paiement_simule"),
    path("api/paiement/webhook/", views.webhook, name="webhook"),
    path("commandes/<uuid:pk>/", views.detail, name="detail"),
    path("commandes/<uuid:pk>/preparer/", views.preparer, name="preparer"),
    path("commandes/<uuid:pk>/expedier/", views.expedier, name="expedier"),
    path("commandes/<uuid:pk>/confirmer/", views.confirmer_reception, name="confirmer"),
    path("commandes/<uuid:pk>/probleme/", views.signaler_probleme, name="signaler_probleme"),
]
