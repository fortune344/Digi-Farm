"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formString } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/dal";
import { getOrderDetail, getPaymentByRef } from "@/lib/orders/queries";
import {
  signWebhookPayload,
  WEBHOOK_SIGNATURE_HEADER,
} from "@/lib/payments/webhook";
import { paymentMethodSchema } from "@/lib/validation/order";

// Simule l'agrégateur : à la validation, on appelle NOTRE webhook signé
// (callback serveur→serveur), exactement comme le ferait un vrai PSP.
export async function confirmMockPaymentAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  const ref = formString(formData.get("ref"));
  const payment = getPaymentByRef(ref);
  if (!payment) redirect("/marche");

  const detail = getOrderDetail(payment.orderId);
  if (!detail || detail.order.acheteurId !== user.id) redirect("/marche");

  if (formString(formData.get("outcome")) !== "success") {
    redirect(`/commande/${payment.orderId}`);
  }

  const parsedMethode = paymentMethodSchema.safeParse(
    formString(formData.get("methode")),
  );
  const methode = parsedMethode.success ? parsedMethode.data : "flooz";

  const payload = JSON.stringify({
    ref,
    amount: payment.montant,
    status: "success",
    methode,
  });
  const signature = signWebhookPayload(payload);

  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  try {
    await fetch(`${proto}://${host}/api/paiement/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [WEBHOOK_SIGNATURE_HEADER]: signature,
      },
      body: payload,
    });
  } catch {
    // le webhook réessaiera en conditions réelles ; ici on continue.
  }

  redirect(`/commande/${payment.orderId}`);
}
