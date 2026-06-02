import { describe, expect, it } from "vitest";
import {
  assertOrderTransition,
  canOpenDispute,
  canTransitionOrder,
  OrderStatusError,
} from "./order-status";

describe("statut de commande", () => {
  it("autorise le flux nominal payee → preparee → expediee → livree", () => {
    expect(canTransitionOrder("payee", "preparee")).toBe(true);
    expect(canTransitionOrder("preparee", "expediee")).toBe(true);
    expect(canTransitionOrder("expediee", "livree")).toBe(true);
  });

  it("autorise la confirmation directe (retrait sur place)", () => {
    expect(canTransitionOrder("payee", "livree")).toBe(true);
    expect(canTransitionOrder("preparee", "livree")).toBe(true);
  });

  it("autorise le litige avant livraison", () => {
    expect(canTransitionOrder("payee", "litige")).toBe(true);
    expect(canTransitionOrder("expediee", "litige")).toBe(true);
  });

  it("interdit toute transition après livraison/annulation", () => {
    expect(canTransitionOrder("livree", "preparee")).toBe(false);
    expect(canTransitionOrder("annulee", "livree")).toBe(false);
  });

  it("assertOrderTransition lève sur transition interdite", () => {
    expect(() => assertOrderTransition("livree", "preparee")).toThrow(
      OrderStatusError,
    );
  });

  it("canOpenDispute uniquement entre payée et livraison", () => {
    expect(canOpenDispute("payee")).toBe(true);
    expect(canOpenDispute("expediee")).toBe(true);
    expect(canOpenDispute("livree")).toBe(false);
    expect(canOpenDispute("en_attente_paiement")).toBe(false);
  });
});
