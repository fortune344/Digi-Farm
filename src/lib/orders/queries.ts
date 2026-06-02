import "server-only";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  type Listing,
  type Order,
  type OrderItem,
  orderItems,
  orders,
  type Payment,
  paymentAudit,
  payments,
} from "@/db/schema";
import {
  type ModeLivraison,
  type OrderStatut,
  PAYMENT_METHODS,
  type SequestreStatut,
} from "@/lib/constants";
import { assertTransition } from "@/lib/payments/escrow";
import { getPaymentProvider } from "@/lib/payments/provider";
import { canOpenDispute, canTransitionOrder } from "./order-status";
import { computeCommission, computeTotal } from "./pricing";
import { planRelease } from "./release";

export type ActionResult = { ok: boolean; message: string };

export type CreateOrderParams = {
  buyerId: string;
  listing: Listing;
  quantite: number;
  modeLivraison: ModeLivraison;
  adresse?: string;
};

/** Crée commande + ligne + paiement (en_attente) dans une transaction. */
export function createOrder(params: CreateOrderParams): {
  orderId: string;
  ref: string;
} {
  const { buyerId, listing, quantite, modeLivraison, adresse } = params;
  const total = computeTotal(listing.prix, quantite);
  const commission = computeCommission(total);
  const orderId = randomUUID();
  const paymentId = randomUUID();
  const ref = randomUUID(); // référence agrégateur (simulée)

  db.transaction((tx) => {
    tx.insert(orders)
      .values({
        id: orderId,
        acheteurId: buyerId,
        agriculteurId: listing.agriculteurId,
        total,
        modeLivraison,
        adresseLivraison: adresse ?? null,
      })
      .run();
    tx.insert(orderItems)
      .values({
        id: randomUUID(),
        orderId,
        listingId: listing.id,
        titre: listing.titre,
        prixUnitaire: listing.prix,
        quantite,
      })
      .run();
    tx.insert(payments)
      .values({
        id: paymentId,
        orderId,
        montant: total,
        fraisCommission: commission,
        refAgregateur: ref,
      })
      .run();
    tx.insert(paymentAudit)
      .values({
        id: randomUUID(),
        paymentId,
        fromStatut: null,
        toStatut: "en_attente",
        acteur: "system",
        montant: total,
        note: "Commande créée",
      })
      .run();
  });

  return { orderId, ref };
}

export function getPaymentByRef(ref: string): Payment | null {
  return (
    db.select().from(payments).where(eq(payments.refAgregateur, ref)).get() ??
    null
  );
}

export function getOrderDetail(id: string): {
  order: Order;
  payment: Payment | null;
  items: OrderItem[];
} | null {
  const order = db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return null;
  const payment =
    db.select().from(payments).where(eq(payments.orderId, id)).get() ?? null;
  const items = db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    .all();
  return { order, payment, items };
}

export type OrderSummary = {
  order: Order;
  payment: Payment;
  item: OrderItem | null;
};

export function getOrdersByBuyer(buyerId: string): OrderSummary[] {
  return db
    .select({ order: orders, payment: payments, item: orderItems })
    .from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.acheteurId, buyerId))
    .orderBy(desc(orders.createdAt))
    .all();
}

export type WebhookResult = { ok: boolean; status: number; message: string };

/**
 * Traite un événement de paiement (appelé par le webhook signé, côté serveur).
 * Idempotent, vérifie le montant, journalise chaque transition.
 * NE LIBÈRE JAMAIS les fonds : s'arrête à "sequestre" (libération = Phase 5).
 */
export function processPaymentEvent(params: {
  ref: string;
  amount: number;
  status: string;
  methode?: string | null;
}): WebhookResult {
  const payment = getPaymentByRef(params.ref);
  if (!payment)
    return { ok: false, status: 404, message: "paiement introuvable" };

  if (params.status !== "success") {
    return { ok: true, status: 200, message: "paiement non réussi, ignoré" };
  }

  // Idempotence : un même événement reçu deux fois ne paie pas deux fois.
  if (payment.statutSequestre !== "en_attente") {
    return { ok: true, status: 200, message: "déjà traité (idempotent)" };
  }

  // Vérification stricte du montant.
  if (Number(params.amount) !== payment.montant) {
    return { ok: false, status: 400, message: "montant incohérent" };
  }

  // Transitions autorisées (lèvent si invalides).
  assertTransition("en_attente", "collecte");
  assertTransition("collecte", "sequestre");

  const methode = (PAYMENT_METHODS as readonly string[]).includes(
    params.methode ?? "",
  )
    ? (params.methode as Payment["methode"])
    : null;

  const transition = (
    from: SequestreStatut,
    to: SequestreStatut,
    acteur: string,
    note: string,
  ) => ({
    id: randomUUID(),
    paymentId: payment.id,
    fromStatut: from,
    toStatut: to,
    acteur,
    montant: payment.montant,
    note,
  });

  db.transaction((tx) => {
    tx.insert(paymentAudit)
      .values(transition("en_attente", "collecte", "webhook", "PayIn confirmé"))
      .run();
    tx.insert(paymentAudit)
      .values(
        transition("collecte", "sequestre", "system", "Fonds sous séquestre"),
      )
      .run();
    tx.update(payments)
      .set({ statutSequestre: "sequestre", methode, updatedAt: new Date() })
      .where(eq(payments.id, payment.id))
      .run();
    tx.update(orders)
      .set({ statut: "payee", updatedAt: new Date() })
      .where(eq(orders.id, payment.orderId))
      .run();
  });

  return { ok: true, status: 200, message: "séquestré" };
}

// --- Phase 5 : suivi, confirmation de réception, litige ---

export function getOrdersBySeller(sellerId: string): OrderSummary[] {
  return db
    .select({ order: orders, payment: payments, item: orderItems })
    .from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.agriculteurId, sellerId))
    .orderBy(desc(orders.createdAt))
    .all();
}

/** L'agriculteur fait avancer SA commande (payee→preparee→expediee). */
export function advanceOrderStatus(
  orderId: string,
  sellerId: string,
  to: OrderStatut,
): ActionResult {
  const order = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) return { ok: false, message: "Commande introuvable." };
  if (order.agriculteurId !== sellerId) {
    return { ok: false, message: "Action non autorisée." };
  }
  if (!canTransitionOrder(order.statut, to)) {
    return {
      ok: false,
      message: "Cette action n'est pas possible maintenant.",
    };
  }
  db.update(orders)
    .set({ statut: to, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .run();
  return { ok: true, message: "Statut mis à jour." };
}

/**
 * Confirmation de réception par l'acheteur → libération du séquestre :
 * PayOut du montant net (total − commission) vers l'agriculteur, commande livrée.
 * Action SERVEUR uniquement. Bloquée si litige. Idempotente (statut vérifié).
 */
export function releaseEscrowOnReception(
  orderId: string,
  buyerId: string,
): ActionResult {
  const detail = getOrderDetail(orderId);
  if (!detail || !detail.payment) {
    return { ok: false, message: "Commande introuvable." };
  }
  const { order, payment } = detail;
  if (order.acheteurId !== buyerId) {
    return { ok: false, message: "Action non autorisée." };
  }

  const plan = planRelease(order, payment);
  if (!plan.ok) return { ok: false, message: plan.reason };

  // PayOut réel (ici simulé) vers l'agriculteur.
  const payout = getPaymentProvider().payout({
    ref: payment.refAgregateur,
    amount: plan.net,
    orderId,
  });
  if (!payout.ok) {
    return { ok: false, message: "Le reversement a échoué, réessayez." };
  }

  assertTransition("sequestre", "libere");
  db.transaction((tx) => {
    tx.insert(paymentAudit)
      .values({
        id: randomUUID(),
        paymentId: payment.id,
        fromStatut: "sequestre",
        toStatut: "libere",
        acteur: "acheteur",
        montant: plan.net,
        note: `Réception confirmée — PayOut ${payout.payoutRef ?? ""}`.trim(),
      })
      .run();
    tx.update(payments)
      .set({ statutSequestre: "libere", updatedAt: new Date() })
      .where(eq(payments.id, payment.id))
      .run();
    tx.update(orders)
      .set({ statut: "livree", updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .run();
  });

  return { ok: true, message: "Réception confirmée. Le vendeur a été payé." };
}

/** Ouvre un litige (acheteur ou vendeur) : bloque la libération du séquestre. */
export function openDispute(
  orderId: string,
  actorUserId: string,
  motif: string,
): ActionResult {
  const order = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) return { ok: false, message: "Commande introuvable." };
  if (order.acheteurId !== actorUserId && order.agriculteurId !== actorUserId) {
    return { ok: false, message: "Action non autorisée." };
  }
  if (!canOpenDispute(order.statut)) {
    return { ok: false, message: "Impossible d'ouvrir un litige à ce stade." };
  }
  db.update(orders)
    .set({
      statut: "litige",
      litigeMotif: motif || null,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))
    .run();
  return {
    ok: true,
    message: "Litige ouvert. Un administrateur va l'examiner.",
  };
}
