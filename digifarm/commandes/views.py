"""Vues de commande : tunnel d'achat, paiement simulé, webhook, suivi.

Autorisation : une commande n'est visible que par son acheteur et son vendeur
(règle n°1). Chaque action vérifie en plus QUI a le droit de la déclencher.
"""

import json

from django.contrib import messages
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods, require_POST

from annonces.models import Annonce
from core import metier
from core.autorisation import acheteur_requis, agriculteur_requis, est_partie_prenante

from . import services
from .agregateur import DemandePaiement, agregateur_courant, signature_valide
from .forms import CommanderForm, LitigeForm
from .models import Commande, Paiement
from .statuts import ETAPES_SUIVI, index_etape, peut_ouvrir_litige
from .tarifs import calculer_commission, calculer_total


@acheteur_requis
@require_http_methods(["GET", "POST"])
def commander(request, annonce_pk):
    """Tunnel d'achat : quantité, livraison, récapitulatif, puis paiement."""
    annonce = get_object_or_404(
        Annonce.objects.select_related("agriculteur__profil").prefetch_related("photos"),
        pk=annonce_pk,
    )

    if annonce.agriculteur_id == request.user.pk:
        messages.error(request, "Vous ne pouvez pas acheter votre propre annonce.")
        return redirect(annonce.get_absolute_url())
    if not annonce.est_disponible:
        messages.error(request, "Cette annonce n'est plus disponible.")
        return redirect(annonce.get_absolute_url())

    formulaire = CommanderForm(request.POST or None, annonce=annonce)
    if request.method == "POST" and formulaire.is_valid():
        try:
            commande = services.creer_commande(
                acheteur=request.user,
                annonce=annonce,
                quantite=formulaire.cleaned_data["quantite"],
                mode_livraison=formulaire.cleaned_data["mode_livraison"],
                adresse=formulaire.cleaned_data["adresse"],
            )
        except services.CommandeImpossible as erreur:
            messages.error(request, str(erreur))
            return redirect(annonce.get_absolute_url())

        # Redirection vers l'agrégateur (ici : la page de paiement simulée).
        url = agregateur_courant().creer_paiement(
            DemandePaiement(
                ref=str(commande.paiement.ref_agregateur),
                montant=commande.total,
                commande_id=str(commande.pk),
            )
        )
        return redirect(url)

    # Aperçu du total pendant la saisie : recalculé côté serveur, comme le vrai.
    quantite_saisie = formulaire["quantite"].value()
    apercu = None
    if quantite_saisie:
        try:
            total = calculer_total(annonce.prix, quantite_saisie)
            apercu = {
                "total": total,
                "commission": calculer_commission(total),
            }
        except (TypeError, ValueError, ArithmeticError):
            apercu = None

    return render(
        request,
        "commandes/commander.html",
        {"annonce": annonce, "formulaire": formulaire, "apercu": apercu},
    )


@require_http_methods(["GET", "POST"])
def paiement_simule(request, ref):
    """Page de paiement de l'agrégateur SIMULÉ.

    Elle remplace le site de Flooz / Mixx / la banque. Valider envoie un
    événement au webhook, exactement comme le ferait le vrai agrégateur.
    """
    paiement = get_object_or_404(
        Paiement.objects.select_related("commande"), ref_agregateur=ref
    )

    # Seul l'acheteur de la commande peut voir sa page de paiement.
    if not request.user.is_authenticated or paiement.commande.acheteur_id != request.user.pk:
        raise Http404("Paiement introuvable.")

    if request.method == "POST":
        methode = request.POST.get("methode", "")
        resultat = services.traiter_evenement_paiement(
            ref=str(paiement.ref_agregateur),
            montant=paiement.montant,
            statut="success" if request.POST.get("action") == "payer" else "failed",
            methode=methode,
        )
        if resultat.ok and request.POST.get("action") == "payer":
            messages.success(
                request,
                "Paiement reçu. Les fonds sont sous séquestre jusqu'à votre "
                "confirmation de réception.",
            )
        elif not resultat.ok:
            messages.error(request, f"Paiement refusé : {resultat.message}.")
        else:
            messages.error(request, "Paiement abandonné.")
        return redirect("commandes:detail", pk=paiement.commande_id)

    return render(
        request,
        "commandes/paiement_simule.html",
        {
            "paiement": paiement,
            "commande": paiement.commande,
            "methodes": metier.METHODES_PAIEMENT,
        },
    )


@csrf_exempt
@require_POST
def webhook(request):
    """Webhook de l'agrégateur : confirme l'encaissement (PayIn).

    Pas de CSRF ici — l'appel vient d'un serveur, pas d'un navigateur. La
    protection, c'est la SIGNATURE : sans en-tête valide, on ne lit même pas le
    corps du message.
    """
    signature = request.headers.get("X-Digifarm-Signature", "")
    if not signature_valide(request.body, signature):
        return JsonResponse({"erreur": "signature invalide"}, status=401)

    try:
        charge = json.loads(request.body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return JsonResponse({"erreur": "corps illisible"}, status=400)

    ref = charge.get("ref")
    montant = charge.get("montant")
    statut = charge.get("statut")
    if not ref or montant is None or not statut:
        return JsonResponse({"erreur": "champs manquants"}, status=400)

    try:
        resultat = services.traiter_evenement_paiement(
            ref=str(ref),
            montant=int(montant),
            statut=str(statut),
            methode=str(charge.get("methode") or ""),
        )
    except (TypeError, ValueError):
        return JsonResponse({"erreur": "montant invalide"}, status=400)

    return JsonResponse(
        {"ok": resultat.ok, "message": resultat.message}, status=resultat.code
    )


def _commande_visible(request, pk) -> Commande:
    """Charge une commande et vérifie que l'utilisateur en est une partie."""
    commande = get_object_or_404(
        Commande.objects.select_related(
            "paiement", "acheteur__profil", "agriculteur__profil"
        ).prefetch_related("lignes__annonce__photos", "paiement__journal"),
        pk=pk,
    )
    if not est_partie_prenante(commande, request.user):
        # 404 et non 403 : inutile de confirmer que cette commande existe.
        raise Http404("Commande introuvable.")
    return commande


@require_http_methods(["GET"])
def detail(request, pk):
    """Suivi d'une commande, vu par l'acheteur ou par le vendeur."""
    commande = _commande_visible(request, pk)
    paiement = getattr(commande, "paiement", None)
    est_vendeur = commande.agriculteur_id == request.user.pk
    est_acheteur = commande.acheteur_id == request.user.pk

    peut_confirmer = (
        est_acheteur
        and paiement is not None
        and paiement.est_sous_sequestre
        and commande.statut
        in (metier.CMD_PAYEE, metier.CMD_PREPAREE, metier.CMD_EXPEDIEE)
    )

    etapes = [
        {
            "cle": etape,
            "libelle": dict(metier.STATUTS_COMMANDE)[etape],
            "atteinte": index_etape(commande.statut) >= position,
            "courante": commande.statut == etape,
        }
        for position, etape in enumerate(ETAPES_SUIVI)
    ]

    return render(
        request,
        "commandes/detail.html",
        {
            "commande": commande,
            "paiement": paiement,
            "lignes": commande.lignes.all(),
            "etapes": etapes,
            "est_vendeur": est_vendeur,
            "est_acheteur": est_acheteur,
            "peut_confirmer": peut_confirmer,
            "peut_preparer": est_vendeur and commande.statut == metier.CMD_PAYEE,
            "peut_expedier": est_vendeur and commande.statut == metier.CMD_PREPAREE,
            "peut_ouvrir_litige": peut_ouvrir_litige(commande.statut),
            "formulaire_litige": LitigeForm(),
            "journal": paiement.journal.all() if paiement else [],
        },
    )


@agriculteur_requis
@require_POST
def preparer(request, pk):
    resultat = services.avancer_statut(
        commande_id=pk, vendeur=request.user, vers=metier.CMD_PREPAREE
    )
    _signaler(request, resultat)
    return _retour(request, pk)


@agriculteur_requis
@require_POST
def expedier(request, pk):
    resultat = services.avancer_statut(
        commande_id=pk, vendeur=request.user, vers=metier.CMD_EXPEDIEE
    )
    _signaler(request, resultat)
    return _retour(request, pk)


@acheteur_requis
@require_POST
def confirmer_reception(request, pk):
    """Confirmation de réception : libère le paiement vers l'agriculteur."""
    resultat = services.liberer_sur_reception(commande_id=pk, acheteur=request.user)
    _signaler(request, resultat)
    return _retour(request, pk)


@require_POST
def signaler_probleme(request, pk):
    """Ouvre un litige. Accessible aux deux parties de la commande."""
    if not request.user.is_authenticated:
        raise Http404("Commande introuvable.")
    formulaire = LitigeForm(request.POST)
    if not formulaire.is_valid():
        messages.error(request, "Décrivez le problème pour ouvrir un litige.")
        return _retour(request, pk)

    resultat = services.ouvrir_litige(
        commande_id=pk, acteur=request.user, motif=formulaire.cleaned_data["motif"]
    )
    _signaler(request, resultat)
    return _retour(request, pk)


def _signaler(request, resultat: services.Resultat) -> None:
    """Transforme le résultat d'un service en message pour l'utilisateur."""
    if resultat.ok:
        messages.success(request, resultat.message)
    else:
        messages.error(request, resultat.message)


def _retour(request, pk) -> HttpResponse:
    """Revient là d'où l'action a été déclenchée : la file du tableau de bord
    ou la page de la commande."""
    retour = request.POST.get("retour", "")
    if retour == "tableau_de_bord":
        return redirect("comptes:tableau_de_bord")
    return redirect("commandes:detail", pk=pk)
