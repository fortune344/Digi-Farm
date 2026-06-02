import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, EscrowError } from "./escrow";

describe("machine à états du séquestre", () => {
  it("autorise le flux nominal en_attente → collecte → sequestre → libere", () => {
    expect(canTransition("en_attente", "collecte")).toBe(true);
    expect(canTransition("collecte", "sequestre")).toBe(true);
    expect(canTransition("sequestre", "libere")).toBe(true);
  });

  it("autorise le remboursement avant la libération", () => {
    expect(canTransition("en_attente", "rembourse")).toBe(true);
    expect(canTransition("collecte", "rembourse")).toBe(true);
    expect(canTransition("sequestre", "rembourse")).toBe(true);
  });

  it("interdit les sauts d'état et les états terminaux", () => {
    expect(canTransition("en_attente", "sequestre")).toBe(false);
    expect(canTransition("en_attente", "libere")).toBe(false);
    expect(canTransition("libere", "rembourse")).toBe(false);
    expect(canTransition("rembourse", "libere")).toBe(false);
  });

  it("assertTransition lève EscrowError sur transition interdite", () => {
    expect(() => assertTransition("libere", "sequestre")).toThrow(EscrowError);
    expect(() => assertTransition("en_attente", "collecte")).not.toThrow();
  });
});
