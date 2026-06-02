import type { OrderStatut } from "@/lib/constants";

// Transitions autorisées du statut de commande (logique PURE, testable).
export const ORDER_TRANSITIONS: Record<OrderStatut, readonly OrderStatut[]> = {
  en_attente_paiement: ["payee", "annulee"],
  payee: ["preparee", "livree", "litige"],
  preparee: ["expediee", "livree", "litige"],
  expediee: ["livree", "litige"],
  litige: ["livree", "annulee"],
  livree: [],
  annulee: [],
};

export class OrderStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderStatusError";
  }
}

export function canTransitionOrder(
  from: OrderStatut,
  to: OrderStatut,
): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function assertOrderTransition(
  from: OrderStatut,
  to: OrderStatut,
): void {
  if (!canTransitionOrder(from, to)) {
    throw new OrderStatusError(
      `Transition de commande interdite : ${from} → ${to}`,
    );
  }
}

/** Un litige ne peut s'ouvrir que sur une commande payée et non encore livrée. */
export function canOpenDispute(statut: OrderStatut): boolean {
  return statut === "payee" || statut === "preparee" || statut === "expediee";
}
