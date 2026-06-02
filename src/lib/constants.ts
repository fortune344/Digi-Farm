// Constantes métier partagées (rôles, régions). Utilisées par le schéma DB,
// la validation et l'UI — source unique de vérité.

export const ROLES = ["agriculteur", "acheteur", "admin"] as const;
export type Role = (typeof ROLES)[number];

// Rôles que l'on peut choisir à l'inscription (admin créé manuellement).
export const SIGNUP_ROLES = ["agriculteur", "acheteur"] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  agriculteur: "Agriculteur",
  acheteur: "Acheteur",
  admin: "Administrateur",
};

// Les 5 régions du Togo.
export const REGIONS = [
  "Maritime",
  "Plateaux",
  "Centrale",
  "Kara",
  "Savanes",
] as const;
export type Region = (typeof REGIONS)[number];

// Catégories de produits agricoles (table de référence reportée — voir SPEC).
export const CATEGORIES = [
  "Céréales",
  "Légumes",
  "Tubercules & racines",
  "Légumineuses",
  "Fruits",
  "Oléagineux",
  "Épices & condiments",
  "Autres",
] as const;
export type Categorie = (typeof CATEGORIES)[number];

// Unités de vente.
export const UNITES = ["kg", "sac", "tonne"] as const;
export type Unite = (typeof UNITES)[number];

// Statuts d'une annonce.
export const LISTING_STATUTS = ["active", "epuisee", "suspendue"] as const;
export type ListingStatut = (typeof LISTING_STATUTS)[number];

export const LISTING_STATUT_LABELS: Record<ListingStatut, string> = {
  active: "Active",
  epuisee: "Épuisée",
  suspendue: "Suspendue",
};

// Statuts que l'agriculteur peut choisir manuellement (épuisée est dérivé du stock).
export const EDITABLE_STATUTS = ["active", "suspendue"] as const;

// Nombre maximum de photos par annonce.
export const MAX_PHOTOS = 5;

// --- Commandes & paiement (Phase 4) ---

export const ORDER_STATUTS = [
  "en_attente_paiement",
  "payee",
  "preparee",
  "expediee",
  "livree",
  "annulee",
  "litige",
] as const;
export type OrderStatut = (typeof ORDER_STATUTS)[number];

export const ORDER_STATUT_LABELS: Record<OrderStatut, string> = {
  en_attente_paiement: "En attente de paiement",
  payee: "Payée",
  preparee: "Préparée",
  expediee: "Expédiée",
  livree: "Livrée",
  annulee: "Annulée",
  litige: "Litige",
};

export const MODE_LIVRAISONS = ["retrait", "transporteur"] as const;
export type ModeLivraison = (typeof MODE_LIVRAISONS)[number];

export const MODE_LIVRAISON_LABELS: Record<ModeLivraison, string> = {
  retrait: "Retrait sur place",
  transporteur: "Livraison par transporteur",
};

// Machine à états du séquestre (valeurs ASCII en base ; libellés accentués pour l'UI).
// Voir docs/blueprints/paiement.md.
export const SEQUESTRE_STATUTS = [
  "en_attente",
  "collecte",
  "sequestre",
  "libere",
  "rembourse",
] as const;
export type SequestreStatut = (typeof SEQUESTRE_STATUTS)[number];

export const SEQUESTRE_LABELS: Record<SequestreStatut, string> = {
  en_attente: "En attente",
  collecte: "Collecté",
  sequestre: "Sous séquestre",
  libere: "Libéré",
  rembourse: "Remboursé",
};

// Méthodes de paiement simulées (mobile money + carte).
export const PAYMENT_METHODS = ["flooz", "mixx", "carte"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  flooz: "Flooz (Moov)",
  mixx: "Mixx by Yas",
  carte: "Carte bancaire",
};

// Commission plateforme prélevée à la libération (Phase 5).
export const COMMISSION_RATE = 0.05;
