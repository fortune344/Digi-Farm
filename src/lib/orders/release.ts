import type { OrderStatut, SequestreStatut } from "@/lib/constants";
import { netToSeller } from "./pricing";

// Décide si le séquestre peut être libéré (logique PURE, testable).
// La libération = PayOut vers l'agriculteur du montant net (total − commission).
type OrderLike = { statut: OrderStatut };
type PaymentLike = {
  statutSequestre: SequestreStatut;
  montant: number;
  fraisCommission: number;
};

export type ReleaseDecision =
  | { ok: true; net: number }
  | { ok: false; reason: string };

export function planRelease(
  order: OrderLike,
  payment: PaymentLike,
): ReleaseDecision {
  if (order.statut === "litige") {
    return { ok: false, reason: "Un litige est en cours sur cette commande." };
  }
  if (payment.statutSequestre === "libere") {
    return { ok: false, reason: "Le paiement a déjà été libéré." };
  }
  if (payment.statutSequestre !== "sequestre") {
    return { ok: false, reason: "Les fonds ne sont pas sous séquestre." };
  }
  return {
    ok: true,
    net: netToSeller(payment.montant, payment.fraisCommission),
  };
}
