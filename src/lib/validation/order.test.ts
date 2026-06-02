import { describe, expect, it } from "vitest";
import { orderSchema } from "./order";

describe("orderSchema", () => {
  it("accepte un retrait sans adresse", () => {
    expect(
      orderSchema.safeParse({
        quantite: "2",
        modeLivraison: "retrait",
        adresse: "",
      }).success,
    ).toBe(true);
  });

  it("exige une adresse pour le transporteur", () => {
    expect(
      orderSchema.safeParse({
        quantite: "2",
        modeLivraison: "transporteur",
        adresse: "",
      }).success,
    ).toBe(false);
    expect(
      orderSchema.safeParse({
        quantite: "2",
        modeLivraison: "transporteur",
        adresse: "Lomé, Tokoin, +228 90000000",
      }).success,
    ).toBe(true);
  });

  it("rejette une quantité nulle ou négative", () => {
    expect(
      orderSchema.safeParse({ quantite: "0", modeLivraison: "retrait" })
        .success,
    ).toBe(false);
    expect(
      orderSchema.safeParse({ quantite: "-1", modeLivraison: "retrait" })
        .success,
    ).toBe(false);
  });
});
