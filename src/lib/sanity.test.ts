import { describe, expect, it } from "vitest";

// Test de sanité : confirme que le harnais de test s'exécute réellement.
// Sera remplacé par de vrais tests métier dès la Phase 1.
describe("sanity", () => {
  it("exécute bien les tests", () => {
    expect(1 + 1).toBe(2);
  });
});
