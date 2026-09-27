"""Jeu de démonstration : vendeurs, acheteurs, annonces et commandes.

    python manage.py seed_demo                 crée ce qui manque
    python manage.py seed_demo --clean         repart de zéro (données de démo)
    python manage.py seed_demo --sans-commande annonces seulement

Le catalogue vient de core/fixtures/catalogue_demo.json — les mêmes 26 produits
et les mêmes photos Wikimedia que la version Next, pour ne pas refaire ce travail
de curation.

Les commandes sont créées en passant par les VRAIS services (paiement, séquestre,
libération) : le journal d'audit est donc cohérent, et le seed vérifie au passage
que le parcours complet fonctionne.
"""

import json
import shutil
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from annonces.models import Annonce, Photo
from commandes import services
from commandes.models import Commande
from comptes.models import Profil
from core import metier

MOT_DE_PASSE_DEMO = "digifarm2026"

ACHETEURS = [
    {
        "email": "afi.restaurant@digifarm.tg",
        "nom": "Afi Kponton",
        "region": "Maritime",
        "telephone": "+228 90 11 22 33",
    },
    {
        "email": "grossiste.lome@digifarm.tg",
        "nom": "Sodji Grossiste",
        "region": "Maritime",
        "telephone": "+228 91 44 55 66",
    },
]


class Command(BaseCommand):
    help = "Remplit la base avec un jeu de démonstration réaliste."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clean",
            action="store_true",
            help="Supprime d'abord les comptes et annonces de démonstration.",
        )
        parser.add_argument(
            "--sans-commande",
            action="store_true",
            help="Ne crée pas de commandes de démonstration.",
        )
        parser.add_argument(
            "--mot-de-passe",
            default=MOT_DE_PASSE_DEMO,
            help="Mot de passe des comptes de démonstration.",
        )

    def handle(self, *args, **options):
        fixture = Path(__file__).resolve().parents[2] / "fixtures" / "catalogue_demo.json"
        if not fixture.is_file():
            raise CommandError(f"Catalogue introuvable : {fixture}")

        donnees = json.loads(fixture.read_text(encoding="utf-8"))
        mot_de_passe = options["mot_de_passe"]

        if options["clean"]:
            self._nettoyer(donnees)

        with transaction.atomic():
            vendeurs = self._creer_comptes(
                donnees["vendeurs"], metier.ROLE_AGRICULTEUR, mot_de_passe
            )
            acheteurs = self._creer_comptes(
                ACHETEURS, metier.ROLE_ACHETEUR, mot_de_passe
            )
            annonces = self._creer_annonces(donnees["produits"], vendeurs)

        if not options["sans_commande"]:
            self._creer_commandes(annonces, list(acheteurs.values()))

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Jeu de démonstration prêt."))
        self.stdout.write(f"  Vendeurs  : {len(vendeurs)}")
        self.stdout.write(f"  Acheteurs : {len(acheteurs)}")
        self.stdout.write(f"  Annonces  : {Annonce.objects.count()}")
        self.stdout.write(f"  Commandes : {Commande.objects.count()}")
        self.stdout.write("")
        self.stdout.write("Comptes de test (mot de passe identique pour tous) :")
        for email in list(vendeurs) + list(acheteurs):
            self.stdout.write(f"  {email}")
        self.stdout.write(self.style.WARNING(f"  mot de passe : {mot_de_passe}"))

    # -- étapes ---------------------------------------------------------------

    def _nettoyer(self, donnees) -> None:
        emails = [v["email"] for v in donnees["vendeurs"]] + [
            a["email"] for a in ACHETEURS
        ]
        comptes = User.objects.filter(username__in=emails)
        # Les annonces, commandes et paiements partent en cascade avec le compte.
        nb = comptes.count()
        for annonce in Annonce.objects.filter(agriculteur__in=comptes):
            for photo in annonce.photos.all():
                photo.image.delete(save=False)
        comptes.delete()
        self.stdout.write(f"{nb} compte(s) de démonstration supprimé(s).")

    def _creer_comptes(self, definitions, role: str, mot_de_passe: str) -> dict:
        comptes = {}
        for definition in definitions:
            email = definition["email"].lower()
            utilisateur = User.objects.filter(username=email).first()
            if utilisateur is None:
                utilisateur = User.objects.create_user(
                    username=email,
                    email=email,
                    password=mot_de_passe,
                    first_name=definition["nom"].split(" ")[0][:150],
                )
            Profil.objects.update_or_create(
                utilisateur=utilisateur,
                defaults={
                    "role": role,
                    "nom": definition["nom"],
                    "region": definition.get("region") or "Maritime",
                    "telephone": definition.get("telephone") or "",
                    "verifie": role == metier.ROLE_AGRICULTEUR,
                },
            )
            comptes[email] = utilisateur
        return comptes

    def _creer_annonces(self, produits, vendeurs: dict) -> list:
        annonces = []
        for produit in produits:
            vendeur = vendeurs.get(produit["vendeur"].lower())
            if vendeur is None:
                continue

            annonce, cree = Annonce.objects.get_or_create(
                agriculteur=vendeur,
                titre=produit["titre"],
                defaults={
                    "categorie": produit["categorie"],
                    "description": produit["description"],
                    "prix": produit["prix"],
                    "unite": produit["unite"],
                    "quantite_dispo": Decimal(str(produit["quantite_dispo"])),
                    "region": produit["region"],
                    "statut": metier.STATUT_ACTIVE,
                },
            )
            annonces.append(annonce)
            if cree:
                self._copier_photos(annonce, produit.get("photos") or [])
        self.stdout.write(f"{len(annonces)} annonce(s) en place.")
        return annonces

    def _copier_photos(self, annonce: Annonce, chemins: list) -> None:
        """Réutilise les photos déjà téléchargées par l'ancien seed.

        Les fichiers vivent dans public/uploads/ ; on les recopie dans le dossier
        media/ de Django plutôt que de les retélécharger depuis Wikimedia.
        """
        racine_ancienne = Path(settings.REPO_DIR) / "public"
        for index, chemin in enumerate(chemins[: metier.MAX_PHOTOS]):
            source = racine_ancienne / chemin
            if not source.is_file():
                continue
            destination_relative = f"annonces/{annonce.pk}/{source.name}"
            destination = Path(settings.MEDIA_ROOT) / destination_relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
            Photo.objects.create(
                annonce=annonce, image=destination_relative, ordre=index
            )

    def _creer_commandes(self, annonces: list, acheteurs: list) -> None:
        """Crée une commande dans chaque état du parcours, pour que les tableaux
        de bord aient quelque chose à montrer.

        On passe par les services réels : chaque commande est donc payée via le
        même chemin que la production (séquestre + journal d'audit).
        """
        if not annonces or not acheteurs:
            return
        if Commande.objects.exists():
            self.stdout.write("Des commandes existent déjà : étape ignorée.")
            return

        scenarios = [
            ("payee", "À préparer par le vendeur"),
            ("preparee", "Préparée, pas encore expédiée"),
            ("expediee", "Expédiée, en attente de confirmation"),
            ("livree", "Livrée et payée au vendeur"),
            ("litige", "Litige ouvert par l'acheteur"),
        ]

        utilisables = [a for a in annonces if a.quantite_dispo >= 3]
        for index, (cible, note) in enumerate(scenarios):
            if index >= len(utilisables):
                break
            annonce = utilisables[index]
            acheteur = acheteurs[index % len(acheteurs)]

            commande = services.creer_commande(
                acheteur=acheteur,
                annonce=annonce,
                quantite=Decimal("2"),
                mode_livraison="transporteur" if index % 2 else "retrait",
                adresse="Quartier Bè-Kpota, Lomé" if index % 2 else "",
            )
            # PayIn : l'argent est encaissé puis mis sous séquestre.
            services.traiter_evenement_paiement(
                ref=str(commande.paiement.ref_agregateur),
                montant=commande.total,
                statut="success",
                methode="flooz" if index % 2 else "mixx",
            )

            if cible in ("preparee", "expediee", "livree"):
                services.avancer_statut(
                    commande_id=commande.pk,
                    vendeur=annonce.agriculteur,
                    vers=metier.CMD_PREPAREE,
                )
            if cible in ("expediee", "livree"):
                services.avancer_statut(
                    commande_id=commande.pk,
                    vendeur=annonce.agriculteur,
                    vers=metier.CMD_EXPEDIEE,
                )
            if cible == "livree":
                # Confirmation de réception → libération du séquestre (PayOut).
                services.liberer_sur_reception(
                    commande_id=commande.pk, acheteur=acheteur
                )
            if cible == "litige":
                services.ouvrir_litige(
                    commande_id=commande.pk,
                    acteur=acheteur,
                    motif="Deux sacs sont abîmés, le contenu est humide.",
                )

            self.stdout.write(f"  commande {cible} — {note}")
