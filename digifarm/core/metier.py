"""Constantes métier partagées (rôles, régions, statuts, commission).

Source unique de vérité : utilisée par les modèles, les formulaires et les gabarits.
Port de src/lib/constants.ts (version Next.js).

Les valeurs stockées en base restent en ASCII sans accent (compatibilité avec
l'ancienne base et les webhooks) ; seuls les libellés affichés sont accentués.
"""

from decimal import Decimal

# --- Rôles ---

ROLE_AGRICULTEUR = "agriculteur"
ROLE_ACHETEUR = "acheteur"
ROLE_ADMIN = "admin"

ROLES = [
    (ROLE_AGRICULTEUR, "Agriculteur"),
    (ROLE_ACHETEUR, "Acheteur"),
    (ROLE_ADMIN, "Administrateur"),
]

# Rôles choisissables à l'inscription (admin créé manuellement).
ROLES_INSCRIPTION = [
    (ROLE_AGRICULTEUR, "Agriculteur"),
    (ROLE_ACHETEUR, "Acheteur"),
]

# --- Géographie : les 5 régions du Togo ---

REGIONS = [
    ("Maritime", "Maritime"),
    ("Plateaux", "Plateaux"),
    ("Centrale", "Centrale"),
    ("Kara", "Kara"),
    ("Savanes", "Savanes"),
]

# --- Produits ---

CATEGORIES = [
    ("Céréales", "Céréales"),
    ("Légumes", "Légumes"),
    ("Tubercules & racines", "Tubercules & racines"),
    ("Légumineuses", "Légumineuses"),
    ("Fruits", "Fruits"),
    ("Oléagineux", "Oléagineux"),
    ("Épices & condiments", "Épices & condiments"),
    ("Autres", "Autres"),
]

UNITES = [
    ("kg", "kg"),
    ("sac", "sac"),
    ("tonne", "tonne"),
]

# --- Statuts d'annonce ---

STATUT_ACTIVE = "active"
STATUT_EPUISEE = "epuisee"
STATUT_SUSPENDUE = "suspendue"

STATUTS_ANNONCE = [
    (STATUT_ACTIVE, "Active"),
    (STATUT_EPUISEE, "Épuisée"),
    (STATUT_SUSPENDUE, "Suspendue"),
]

# Statuts que l'agriculteur choisit à la main (« épuisée » est dérivé du stock).
STATUTS_ANNONCE_EDITABLES = [
    (STATUT_ACTIVE, "Active"),
    (STATUT_SUSPENDUE, "Suspendue"),
]

MAX_PHOTOS = 5

# --- Statuts de commande ---

CMD_ATTENTE_PAIEMENT = "en_attente_paiement"
CMD_PAYEE = "payee"
CMD_PREPAREE = "preparee"
CMD_EXPEDIEE = "expediee"
CMD_LIVREE = "livree"
CMD_ANNULEE = "annulee"
CMD_LITIGE = "litige"

STATUTS_COMMANDE = [
    (CMD_ATTENTE_PAIEMENT, "En attente de paiement"),
    (CMD_PAYEE, "Payée"),
    (CMD_PREPAREE, "Préparée"),
    (CMD_EXPEDIEE, "Expédiée"),
    (CMD_LIVREE, "Livrée"),
    (CMD_ANNULEE, "Annulée"),
    (CMD_LITIGE, "Litige"),
]

MODES_LIVRAISON = [
    ("retrait", "Retrait sur place"),
    ("transporteur", "Livraison par transporteur"),
]

# --- Machine à états du séquestre (voir docs/blueprints/paiement.md) ---

SEQ_ATTENTE = "en_attente"
SEQ_COLLECTE = "collecte"
SEQ_SEQUESTRE = "sequestre"
SEQ_LIBERE = "libere"
SEQ_REMBOURSE = "rembourse"

STATUTS_SEQUESTRE = [
    (SEQ_ATTENTE, "En attente"),
    (SEQ_COLLECTE, "Collecté"),
    (SEQ_SEQUESTRE, "Sous séquestre"),
    (SEQ_LIBERE, "Libéré"),
    (SEQ_REMBOURSE, "Remboursé"),
]

# --- Paiement ---

METHODES_PAIEMENT = [
    ("flooz", "Flooz (Moov)"),
    ("mixx", "Mixx by Yas"),
    ("carte", "Carte bancaire"),
]

# Commission de la plateforme, prélevée à la libération du séquestre.
TAUX_COMMISSION = Decimal("0.05")


# --- Habillage des catégories -------------------------------------------------

# Photo et icône associées à chaque catégorie. Les images vivent dans
# static/img/categories/<slug>.webp et sont extraites du catalogue
# (voir scripts/ et core/fixtures/catalogue_demo.json).
HABILLAGE_CATEGORIES: dict[str, dict[str, str]] = {
    "Céréales": {"slug": "cereales", "icone": "wheat"},
    "Légumes": {"slug": "legumes", "icone": "leaf"},
    "Tubercules & racines": {"slug": "tubercules", "icone": "boxes"},
    "Légumineuses": {"slug": "legumineuses", "icone": "shopping-basket"},
    "Fruits": {"slug": "fruits", "icone": "leaf"},
    "Oléagineux": {"slug": "oleagineux", "icone": "coins"},
    "Épices & condiments": {"slug": "epices", "icone": "sprout"},
    "Autres": {"slug": "autres", "icone": "package"},
}


def categories_illustrees() -> list[dict[str, str]]:
    """Catégories prêtes à afficher : valeur, libellé, image et icône.

    Utilisée par la page d'accueil (tuiles) et le marché (filtres visuels).
    """
    illustrees = []
    for valeur, libelle in CATEGORIES:
        habillage = HABILLAGE_CATEGORIES.get(valeur, {"slug": "autres", "icone": "package"})
        illustrees.append(
            {
                "valeur": valeur,
                "libelle": libelle,
                "slug": habillage["slug"],
                "icone": habillage["icone"],
            }
        )
    return illustrees
