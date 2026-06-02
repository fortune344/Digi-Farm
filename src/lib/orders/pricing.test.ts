import { describe, expect, it } from "vitest";
import { computeCommission, computeTotal, netToSeller } from "./pricing";

describe("calculs de prix", () => {
  it("total = prix unitaire × quantité (arrondi)", () => {
    expect(computeTotal(500, 3)).toBe(1500);
    expect(computeTotal(300, 2.5)).toBe(750);
  });

  it("commission à 5 % (arrondie)", () => {
    expect(computeCommission(1000)).toBe(50);
    expect(computeCommission(1500)).toBe(75);
  });

  it("net vendeur = total − commission", () => {
    const total = 18000;
    expect(netToSeller(total, computeCommission(total))).toBe(17100);
  });
});
