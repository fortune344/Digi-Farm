import { z } from "zod";
import { MODE_LIVRAISONS, PAYMENT_METHODS } from "@/lib/constants";

export const orderSchema = z
  .object({
    quantite: z.coerce
      .number()
      .positive("Indiquez une quantité valide.")
      .max(1_000_000, "Quantité trop élevée."),
    modeLivraison: z.enum(MODE_LIVRAISONS, {
      error: "Choisissez un mode de livraison.",
    }),
    adresse: z
      .string()
      .trim()
      .max(300, "Adresse trop longue.")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
  })
  .refine(
    (d) =>
      d.modeLivraison !== "transporteur" ||
      (d.adresse !== undefined && d.adresse.length >= 5),
    {
      error: "Adresse de livraison requise pour le transporteur.",
      path: ["adresse"],
    },
  );

export const paymentMethodSchema = z.enum(PAYMENT_METHODS, {
  error: "Choisissez un moyen de paiement.",
});

export type OrderInput = z.infer<typeof orderSchema>;
