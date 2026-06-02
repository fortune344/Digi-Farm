import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  type Listing,
  listings,
  paymentAudit,
  profiles,
  users,
} from "@/db/schema";
import {
  createOrder,
  getOrderDetail,
  openDispute,
  processPaymentEvent,
  releaseEscrowOnReception,
} from "./queries";

// Test d'intégration (DB réelle) : commande → séquestre → libération.
const SELLER_EMAIL = "itest.seller@digifarm.test";
const BUYER_EMAIL = "itest.buyer@digifarm.test";
const sellerId = randomUUID();
const buyerId = randomUUID();
const listingId = randomUUID();

function cleanup() {
  db.delete(users).where(eq(users.email, SELLER_EMAIL)).run();
  db.delete(users).where(eq(users.email, BUYER_EMAIL)).run();
}

beforeAll(() => {
  cleanup();
  db.insert(users)
    .values({ id: sellerId, email: SELLER_EMAIL, passwordHash: "x" })
    .run();
  db.insert(profiles)
    .values({
      userId: sellerId,
      role: "agriculteur",
      nom: "ITest Seller",
      region: "Maritime",
    })
    .run();
  db.insert(users)
    .values({ id: buyerId, email: BUYER_EMAIL, passwordHash: "x" })
    .run();
  db.insert(profiles)
    .values({
      userId: buyerId,
      role: "acheteur",
      nom: "ITest Buyer",
      region: "Maritime",
    })
    .run();
  db.insert(listings)
    .values({
      id: listingId,
      agriculteurId: sellerId,
      titre: "Tomates test",
      categorie: "Légumes",
      description: "Produit de test",
      prix: 1000,
      unite: "kg",
      quantiteDispo: 100,
      region: "Maritime",
    })
    .run();
});

afterAll(() => cleanup());

const listing = () =>
  db.select().from(listings).where(eq(listings.id, listingId)).get() as Listing;

describe("flux de libération du séquestre", () => {
  it("commande → paiement (séquestre) → confirmation → libération nette", () => {
    const { orderId, ref } = createOrder({
      buyerId,
      listing: listing(),
      quantite: 2,
      modeLivraison: "retrait",
    });

    let detail = getOrderDetail(orderId);
    expect(detail?.payment?.statutSequestre).toBe("en_attente");
    expect(detail?.payment?.montant).toBe(2000);

    expect(
      processPaymentEvent({ ref, amount: 2000, status: "success" }).ok,
    ).toBe(true);
    detail = getOrderDetail(orderId);
    expect(detail?.payment?.statutSequestre).toBe("sequestre");
    expect(detail?.order.statut).toBe("payee");

    expect(releaseEscrowOnReception(orderId, buyerId).ok).toBe(true);
    detail = getOrderDetail(orderId);
    expect(detail?.payment?.statutSequestre).toBe("libere");
    expect(detail?.order.statut).toBe("livree");

    const audits = db
      .select()
      .from(paymentAudit)
      .where(eq(paymentAudit.paymentId, detail?.payment?.id ?? ""))
      .all();
    expect(audits.length).toBe(4); // création + collecte + sequestre + libere
    const libere = audits.find((a) => a.toStatut === "libere");
    expect(libere?.montant).toBe(1900); // 2000 − 5 %
    expect(libere?.acteur).toBe("acheteur");
  });

  it("un litige bloque la libération", () => {
    const { orderId, ref } = createOrder({
      buyerId,
      listing: listing(),
      quantite: 1,
      modeLivraison: "retrait",
    });
    processPaymentEvent({ ref, amount: 1000, status: "success" });
    expect(openDispute(orderId, buyerId, "Produit non conforme").ok).toBe(true);

    expect(releaseEscrowOnReception(orderId, buyerId).ok).toBe(false);
    const detail = getOrderDetail(orderId);
    expect(detail?.payment?.statutSequestre).toBe("sequestre");
    expect(detail?.order.statut).toBe("litige");
  });

  it("refuse la libération demandée par le vendeur", () => {
    const { orderId, ref } = createOrder({
      buyerId,
      listing: listing(),
      quantite: 1,
      modeLivraison: "retrait",
    });
    processPaymentEvent({ ref, amount: 1000, status: "success" });
    expect(releaseEscrowOnReception(orderId, sellerId).ok).toBe(false);
  });
});
