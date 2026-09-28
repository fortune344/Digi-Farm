"""Pages institutionnelles."""

from django.urls import path

from . import vues

app_name = "core"

urlpatterns = [
    path("a-propos/", vues.a_propos, name="a_propos"),
    path("contact/", vues.contact, name="contact"),
    path("faq/", vues.faq, name="faq"),
    path("conditions/", vues.conditions, name="conditions"),
    path("confidentialite/", vues.confidentialite, name="confidentialite"),
]
