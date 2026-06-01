import { describe, expect, it } from "vitest";
import { parseSearchParams } from "./search-params";

describe("parseSearchParams", () => {
  it("applique des valeurs par défaut saines", () => {
    expect(parseSearchParams({})).toEqual({
      q: undefined,
      categorie: undefined,
      region: undefined,
      sort: "recent",
      page: 1,
    });
  });

  it("conserve les filtres valides et nettoie la recherche", () => {
    expect(
      parseSearchParams({
        q: "  tomate ",
        categorie: "Légumes",
        region: "Kara",
        sort: "prix_asc",
        page: "3",
      }),
    ).toEqual({
      q: "tomate",
      categorie: "Légumes",
      region: "Kara",
      sort: "prix_asc",
      page: 3,
    });
  });

  it("ignore les filtres, tris et pages invalides", () => {
    const parsed = parseSearchParams({
      categorie: "Voitures",
      region: "Paris",
      sort: "n_importe_quoi",
      page: "-2",
    });
    expect(parsed.categorie).toBeUndefined();
    expect(parsed.region).toBeUndefined();
    expect(parsed.sort).toBe("recent");
    expect(parsed.page).toBe(1);
  });

  it("prend la première valeur si le param est un tableau", () => {
    expect(parseSearchParams({ q: ["maïs", "soja"] }).q).toBe("maïs");
  });
});
