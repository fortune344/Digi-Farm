"""Autorisation côté serveur — le cœur de la règle n°1.

SQLite n'a pas de RLS : rien dans la base n'empêche une requête de lire les
données d'un autre utilisateur. TOUTE l'isolation se fait donc ici, côté serveur.
Voir docs/blueprints/autorisation.md.

Trois vérifications, dans cet ordre, pour chaque vue qui touche des données :

    1. session valide   -> @login_required (Django)
    2. rôle             -> @role_requis("agriculteur")
    3. propriété        -> objet_possede_par() ou filtrage par utilisateur

Le rôle est TOUJOURS lu depuis Profil en base (règle n°2). Jamais depuis un
champ de formulaire, un paramètre d'URL ou un cookie.
"""

from functools import wraps

from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.http import Http404

from core import metier


def profil_de(utilisateur):
    """Profil métier de l'utilisateur, ou None s'il n'en a pas encore."""
    if utilisateur is None or not utilisateur.is_authenticated:
        return None
    from comptes.models import Profil

    return Profil.objects.filter(utilisateur=utilisateur).first()


def role_de(utilisateur) -> str | None:
    profil = profil_de(utilisateur)
    return profil.role if profil else None


def role_requis(*roles_autorises: str):
    """Exige une session valide ET l'un des rôles donnés.

        @role_requis(metier.ROLE_AGRICULTEUR)
        def publier_annonce(request): ...

    Un utilisateur connecté mais du mauvais rôle reçoit un 403, pas une
    redirection : il n'y a rien de plus à faire pour lui à cette adresse.
    """

    def decorateur(vue):
        @wraps(vue)
        @login_required
        def enveloppe(request, *args, **kwargs):
            profil = profil_de(request.user)
            if profil is None:
                raise PermissionDenied(
                    "Aucun profil n'est associé à ce compte. "
                    "Contactez un administrateur."
                )
            if profil.role not in roles_autorises:
                raise PermissionDenied(
                    "Cette page est réservée à un autre type de compte."
                )
            # Le profil est déjà chargé : les vues le réutilisent sans requête.
            request.profil = profil
            return vue(request, *args, **kwargs)

        return enveloppe

    return decorateur


def agriculteur_requis(vue):
    """Raccourci lisible pour les vues vendeur."""
    return role_requis(metier.ROLE_AGRICULTEUR)(vue)


def acheteur_requis(vue):
    """Raccourci lisible pour les vues acheteur."""
    return role_requis(metier.ROLE_ACHETEUR)(vue)


def objet_possede_par(objet, utilisateur, champ: str = "agriculteur"):
    """Renvoie l'objet s'il appartient à l'utilisateur, sinon lève 404.

    On répond 404 et non 403 : un utilisateur n'a pas à apprendre qu'une
    ressource existe si elle n'est pas à lui (pas d'énumération d'identifiants).
    """
    proprietaire_id = getattr(objet, f"{champ}_id", None)
    if proprietaire_id != utilisateur.pk:
        raise Http404("Ressource introuvable.")
    return objet


def est_partie_prenante(commande, utilisateur) -> bool:
    """Vrai si l'utilisateur est l'acheteur OU le vendeur de cette commande.

    Une commande n'est visible que par ses deux parties (et les admins).
    """
    if not utilisateur.is_authenticated:
        return False
    return utilisateur.pk in (commande.acheteur_id, commande.agriculteur_id)
