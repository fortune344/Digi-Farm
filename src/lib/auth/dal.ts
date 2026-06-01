import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { type Profile, profiles, users } from "@/db/schema";
import type { Role } from "@/lib/constants";
import { getSessionCookie } from "./cookies";
import { validateSessionToken } from "./session";

// Data Access Layer : point d'entrée unique pour connaître l'utilisateur courant.
// `cache` mémorise le résultat le temps d'une requête (pas d'appels DB répétés).

export type CurrentUser = {
  id: string;
  email: string;
  profile: Profile;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getSessionCookie();
  if (!token) return null;

  const session = validateSessionToken(token);
  if (!session) return null;

  const row = db
    .select({ id: users.id, email: users.email, profile: profiles })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, session.userId))
    .get();

  return row ?? null;
});

/** Redirige vers /connexion si non connecté. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}

/** Connecté ET rôle autorisé, sinon redirige (login ou accueil). */
export async function requireRole(...allowed: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!allowed.includes(user.profile.role)) redirect("/");
  return user;
}
