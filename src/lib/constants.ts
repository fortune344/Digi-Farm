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
