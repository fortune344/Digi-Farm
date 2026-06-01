"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import {
  type ActionState,
  formString,
  zodToFieldErrors,
} from "@/lib/action-state";
import { setSessionCookie } from "@/lib/auth/cookies";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { loginSchema, signupSchema } from "@/lib/validation/auth";

// Hash factice (format salt:clé) pour faire échouer la vérification en temps
// constant quand l'e-mail n'existe pas — n'expose pas l'existence d'un compte.
const DUMMY_HASH = `${"0".repeat(32)}:${"0".repeat(128)}`;

export async function signupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Valeurs ressaisies (hors mot de passe) pour les réafficher en cas d'erreur.
  const values = {
    email: formString(formData.get("email")),
    nom: formString(formData.get("nom")),
    role: formString(formData.get("role")),
    region: formString(formData.get("region")),
    telephone: formString(formData.get("telephone")),
  };

  const parsed = signupSchema.safeParse({
    ...values,
    password: formString(formData.get("password")),
  });

  if (!parsed.success) {
    return {
      error: "Veuillez corriger les champs indiqués.",
      fieldErrors: zodToFieldErrors(parsed.error),
      values,
    };
  }

  const { email, password, nom, role, region, telephone } = parsed.data;

  const existing = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .get();
  if (existing) {
    return {
      error: "Un compte existe déjà avec cette adresse e-mail.",
      fieldErrors: { email: "E-mail déjà utilisé." },
      values,
    };
  }

  const passwordHash = await hashPassword(password);
  const userId = randomUUID();

  db.transaction((tx) => {
    tx.insert(users).values({ id: userId, email, passwordHash }).run();
    tx.insert(profiles)
      .values({ userId, role, nom, region, telephone: telephone ?? null })
      .run();
  });

  const token = createSession(userId);
  await setSessionCookie(token);
  redirect("/profil");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = { email: formString(formData.get("email")) };
  const parsed = loginSchema.safeParse({
    email: values.email,
    password: formString(formData.get("password")),
  });

  if (!parsed.success) {
    return {
      error: "E-mail ou mot de passe incorrect.",
      fieldErrors: zodToFieldErrors(parsed.error),
      values,
    };
  }

  const { email, password } = parsed.data;
  const user = db.select().from(users).where(eq(users.email, email)).get();
  const valid = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  if (!user || !valid) {
    return { error: "E-mail ou mot de passe incorrect.", values };
  }

  const token = createSession(user.id);
  await setSessionCookie(token);
  redirect("/profil");
}
