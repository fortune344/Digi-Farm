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
  PAYMENT_METHODS,
  type SequestreStatut,
} from "@/lib/constants";
import { assertTransition } from "@/lib/payments/escrow";
import { computeCommission, computeTotal } from "./pricing";

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
