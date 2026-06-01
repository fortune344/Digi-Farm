import { describe, expect, it } from "vitest";
import { editListingSchema, listingSchema } from "./listing";

const valid = {
  titre: "Tomates fraîches",
  categorie: "Légumes",
  description: "Tomates de saison, bien mûres.",
  prix: "500",
  unite: "kg",
  quantiteDispo: "100",
  region: "Maritime",
};

describe("listingSchema", () => {
  it("accepte une annonce valide et convertit les nombres", () => {
    const result = listingSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prix).toBe(500);
      expect(result.data.quantiteDispo).toBe(100);
    }
  });

  it("rejette un prix nul ou négatif", () => {
    expect(listingSchema.safeParse({ ...valid, prix: "0" }).success).toBe(
      false,
    );
    expect(listingSchema.safeParse({ ...valid, prix: "-5" }).success).toBe(
      false,
    );
  });

  it("rejette un prix non entier", () => {
    expect(listingSchema.safeParse({ ...valid, prix: "5.5" }).success).toBe(
      false,
    );
  });

  it("rejette une catégorie inconnue", () => {
    expect(
      listingSchema.safeParse({ ...valid, categorie: "Voitures" }).success,
    ).toBe(false);
  });

  it("rejette une unité inconnue", () => {
    expect(listingSchema.safeParse({ ...valid, unite: "litre" }).success).toBe(
      false,
    );
  });

  it("rejette une quantité nulle", () => {
    expect(
      listingSchema.safeParse({ ...valid, quantiteDispo: "0" }).success,
    ).toBe(false);
  });
});

describe("editListingSchema", () => {
  it("accepte un statut éditable", () => {
    expect(
      editListingSchema.safeParse({ ...valid, statut: "active" }).success,
    ).toBe(true);
  });

  it("refuse le statut dérivé 'epuisee' (non éditable manuellement)", () => {
    expect(
      editListingSchema.safeParse({ ...valid, statut: "epuisee" }).success,
    ).toBe(false);
  });
});
