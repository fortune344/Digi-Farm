import { z } from "zod";
import { CATEGORIES, EDITABLE_STATUTS, REGIONS, UNITES } from "@/lib/constants";

export const listingSchema = z.object({
  titre: z
    .string()
    .trim()
    .min(3, "Titre trop court.")
    .max(120, "Titre trop long."),
  categorie: z.enum(CATEGORIES, { error: "Choisissez une catégorie." }),
  description: z
    .string()
    .trim()
    .min(10, "Décrivez votre produit (10 caractères min).")
    .max(2000, "Description trop longue."),
  prix: z.coerce
    .number()
    .int("Le prix doit être un entier (FCFA).")
    .positive("Le prix doit être supérieur à 0.")
    .max(100_000_000, "Prix trop élevé."),
  unite: z.enum(UNITES, { error: "Choisissez une unité." }),
  quantiteDispo: z.coerce
    .number()
    .positive("La quantité doit être supérieure à 0.")
    .max(1_000_000, "Quantité trop élevée."),
  region: z.enum(REGIONS, { error: "Choisissez une région." }),
});

export const editListingSchema = listingSchema.extend({
  statut: z.enum(EDITABLE_STATUTS, { error: "Statut invalide." }),
});

export type ListingInput = z.infer<typeof listingSchema>;
export type EditListingInput = z.infer<typeof editListingSchema>;
