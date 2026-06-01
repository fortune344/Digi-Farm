import { describe, expect, it } from "vitest";
import { AuthError, assertOwnership, assertRole, isOwner } from "./policy";

describe("assertRole", () => {
  it("lève UNAUTHENTICATED quand l'acteur est absent", () => {
    expect(() => assertRole(null, ["agriculteur"])).toThrow(AuthError);
    try {
      assertRole(null, ["agriculteur"]);
    } catch (error) {
      expect((error as AuthError).code).toBe("UNAUTHENTICATED");
    }
  });

  it("lève FORBIDDEN quand le rôle n'est pas autorisé", () => {
    try {
      assertRole({ role: "acheteur" }, ["agriculteur"]);
      expect.unreachable("aurait dû lever");
    } catch (error) {
      expect((error as AuthError).code).toBe("FORBIDDEN");
    }
  });

  it("passe quand le rôle est autorisé", () => {
    expect(() =>
      assertRole({ role: "agriculteur" }, ["agriculteur", "admin"]),
    ).not.toThrow();
  });
});

describe("propriété", () => {
  it("isOwner compare correctement", () => {
    expect(isOwner("u1", "u1")).toBe(true);
    expect(isOwner("u1", "u2")).toBe(false);
    expect(isOwner("u1", null)).toBe(false);
  });

  it("assertOwnership lève pour un non-propriétaire", () => {
    expect(() => assertOwnership("u1", "u2")).toThrow(AuthError);
    expect(() => assertOwnership("u1", "u1")).not.toThrow();
  });
});
