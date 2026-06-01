import { describe, expect, it } from "vitest";
import { loginSchema, profileSchema, signupSchema } from "./auth";

const validSignup = {
  email: "  Test@Exemple.com  ",
  password: "motdepasse",
  nom: "Komla Adjo",
  role: "agriculteur",
  region: "Maritime",
  telephone: "",
};

describe("signupSchema", () => {
  it("accepte des données valides et normalise l'e-mail", () => {
    const result = signupSchema.safeParse(validSignup);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@exemple.com");
      expect(result.data.telephone).toBeUndefined();
    }
  });

  it("rejette un e-mail invalide", () => {
    expect(
      signupSchema.safeParse({ ...validSignup, email: "pas-un-email" }).success,
    ).toBe(false);
  });

  it("rejette un mot de passe trop court", () => {
    expect(
      signupSchema.safeParse({ ...validSignup, password: "court" }).success,
    ).toBe(false);
  });

  it("interdit de s'inscrire avec le rôle admin", () => {
    expect(
      signupSchema.safeParse({ ...validSignup, role: "admin" }).success,
    ).toBe(false);
  });

  it("rejette une région inconnue", () => {
    expect(
      signupSchema.safeParse({ ...validSignup, region: "Paris" }).success,
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("exige un mot de passe non vide", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "" }).success,
    ).toBe(false);
  });
});

describe("profileSchema", () => {
  it("accepte une mise à jour valide", () => {
    expect(
      profileSchema.safeParse({
        nom: "Ama",
        region: "Kara",
        telephone: "+22890000000",
      }).success,
    ).toBe(true);
  });
});
