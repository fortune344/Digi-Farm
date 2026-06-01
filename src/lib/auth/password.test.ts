import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("hache au format salt:clé sans exposer le mot de passe en clair", async () => {
    const hash = await hashPassword("motdepasse123");
    expect(hash).not.toContain("motdepasse123");
    expect(hash.split(":")).toHaveLength(2);
  });

  it("vérifie un mot de passe correct", async () => {
    const hash = await hashPassword("Sésame-Ouvre-Toi");
    expect(await verifyPassword("Sésame-Ouvre-Toi", hash)).toBe(true);
  });

  it("rejette un mot de passe incorrect", async () => {
    const hash = await hashPassword("bon-mot-de-passe");
    expect(await verifyPassword("mauvais-mot-de-passe", hash)).toBe(false);
  });

  it("produit un hash différent à chaque fois (sel aléatoire)", async () => {
    expect(await hashPassword("identique")).not.toBe(
      await hashPassword("identique"),
    );
  });

  it("rejette un format de hash invalide", async () => {
    expect(await verifyPassword("peu importe", "pas-un-hash")).toBe(false);
  });
});
