"use server";

import { redirect } from "next/navigation";
import {
  type ActionState,
  formString,
  zodToFieldErrors,
} from "@/lib/action-state";
import { requireRole } from "@/lib/auth/dal";
import { getListingById } from "@/lib/listings/queries";
import { computeTotal } from "@/lib/orders/pricing";
import { createOrder } from "@/lib/orders/queries";
import { getPaymentProvider } from "@/lib/payments/provider";
import { orderSchema } from "@/lib/validation/order";

export async function createOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("acheteur");
  const listing = getListingById(formString(formData.get("listingId")));

  if (!listing || listing.statut !== "active") {
    return { error: "Cette annonce n'est plus disponible." };
  }
  if (listing.agriculteurId === user.id) {
    return { error: "Vous ne pouvez pas commander votre propre annonce." };
  }

  const values = {
    quantite: formString(formData.get("quantite")),
    modeLivraison: formString(formData.get("modeLivraison")),
    adresse: formString(formData.get("adresse")),
  };
  const parsed = orderSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: "Veuillez corriger les champs indiqués.",
      fieldErrors: zodToFieldErrors(parsed.error),
      values,
    };
  }

  if (parsed.data.quantite > listing.quantiteDispo) {
    return {
      error: `Quantité indisponible (maximum ${listing.quantiteDispo} ${listing.unite}).`,
      values,
    };
  }

  const { orderId, ref } = createOrder({
    buyerId: user.id,
    listing,
    quantite: parsed.data.quantite,
    modeLivraison: parsed.data.modeLivraison,
    adresse: parsed.data.adresse,
  });

  const { redirectUrl } = getPaymentProvider().createCheckout({
    ref,
    orderId,
    amount: computeTotal(listing.prix, parsed.data.quantite),
  });

  redirect(redirectUrl);
}
