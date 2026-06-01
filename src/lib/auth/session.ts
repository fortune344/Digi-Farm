import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { type Session, sessions } from "@/db/schema";

// Durée de vie d'une session et seuil de renouvellement glissant.
const DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours
const RENEW_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 15; // renouvelle si < 15 jours restants

/** Token aléatoire déposé dans le cookie (jamais stocké tel quel en base). */
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/** Empreinte stockée en base : un vol de la base ne permet pas d'usurper la session. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSession(userId: string): string {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + DURATION_MS);
  db.insert(sessions)
    .values({ id: hashToken(token), userId, expiresAt })
    .run();
  return token;
}

/** Renvoie la session valide (et la renouvelle au besoin), ou null. */
export function validateSessionToken(token: string): Session | null {
  const id = hashToken(token);
  const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) return null;

  if (Date.now() >= session.expiresAt.getTime()) {
    db.delete(sessions).where(eq(sessions.id, id)).run();
    return null;
  }

  if (Date.now() >= session.expiresAt.getTime() - RENEW_THRESHOLD_MS) {
    const expiresAt = new Date(Date.now() + DURATION_MS);
    db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id)).run();
    session.expiresAt = expiresAt;
  }

  return session;
}

export function invalidateSession(token: string): void {
  db.delete(sessions)
    .where(eq(sessions.id, hashToken(token)))
    .run();
}
