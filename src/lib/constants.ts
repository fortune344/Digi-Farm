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
