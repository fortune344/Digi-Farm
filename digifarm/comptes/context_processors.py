"""Expose le profil de l'utilisateur connecté à tous les gabarits.

Évite un `request.user.profil` dans chaque vue et un plantage si le profil
manque (utilisateur créé en ligne de commande, par exemple).
"""

from comptes.models import Profil


def profil_courant(request):
    utilisateur = getattr(request, "user", None)
    if utilisateur is None or not utilisateur.is_authenticated:
        return {"profil": None}
    return {"profil": Profil.objects.filter(utilisateur=utilisateur).first()}
