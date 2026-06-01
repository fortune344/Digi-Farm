import { z } from "zod";
import { REGIONS, SIGNUP_ROLES } from "@/lib/constants";

const email = z.string().trim().toLowerCase().email("Adresse e-mail invalide.");

const telephone = z
  .string()
  .trim()
  .max(30, "Numéro trop long.")
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : undefined));

const nom = z
  .string()
  .trim()
  .min(2, "Nom trop court.")
  .max(120, "Nom trop long.");

const region = z.enum(REGIONS, { error: "Choisissez une région." });

export const signupSchema = z.object({
  email,
  password: z
    .string()
    .min(8, "Au moins 8 caractères.")
    .max(200, "Mot de passe trop long."),
  nom,
  role: z.enum(SIGNUP_ROLES, { error: "Choisissez un rôle." }),
  region,
  telephone,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Mot de passe requis."),
});

export const profileSchema = z.object({
  nom,
  region,
  telephone,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
