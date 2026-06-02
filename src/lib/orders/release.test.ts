import { describe, expect, it } from "vitest";
import type { OrderStatut, SequestreStatut } from "@/lib/constants";
import { planRelease } from "./release";

const order = (statut: OrderStatut) => ({ statut });
const payment = (statutSequestre: SequestreStatut) => ({
  statutSequestre,
  montant: 1000,
  fraisCommission: 50,
});

describe("planRelease", () => {
  it("libère le net (total − commission) quand séquestré et sans litige", () => {
    const r = planRelease(order("expediee"), payment("sequestre"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.net).toBe(950);
  });

  it("refuse en cas de litige", () => {
    expect(planRelease(order("litige"), payment("sequestre")).ok).toBe(false);
  });

  it("refuse si déjà libéré", () => {
    expect(planRelease(order("livree"), payment("libere")).ok).toBe(false);
  });

  it("refuse si les fonds ne sont pas séquestrés", () => {
    expect(planRelease(order("payee"), payment("en_attente")).ok).toBe(false);
  });
});
