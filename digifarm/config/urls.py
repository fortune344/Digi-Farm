"""Routage racine de Digi-Farm."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("core.urls")),
    path("", include("comptes.urls")),
    path("", include("commandes.urls")),
    path("", include("annonces.urls")),
]

# En développement, Django sert les photos d'annonces. En production, c'est le
# serveur web (nginx) qui s'en charge — voir le futur guide de déploiement.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
