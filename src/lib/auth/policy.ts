import type { Role } from "@/lib/constants";

// Logique d'autorisation PURE (sans I/O) → testable unitairement.
// Voir docs/blueprints/autorisation.md.

export type AuthErrorCode = "UNAUTHENTICATED" | "FORBIDDEN";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

type HasRole = { role: Role };

/** Vérifie que l'acteur est connecté et possède un rôle autorisé. Lève sinon. */
export function assertRole(
  actor: HasRole | null | undefined,
  allowed: readonly Role[],
): asserts actor is HasRole {
  if (!actor) {
    throw new AuthError("UNAUTHENTICATED", "Connexion requise.");
  }
  if (!allowed.includes(actor.role)) {
    throw new AuthError("FORBIDDEN", "Accès refusé.");
  }
}

/** Vrai si l'utilisateur est propriétaire de la ressource. */
export function isOwner(
  resourceOwnerId: string,
  userId: string | null | undefined,
): boolean {
  return Boolean(userId) && resourceOwnerId === userId;
}

/** Vérifie la propriété d'une ressource. Lève sinon. */
export function assertOwnership(
  resourceOwnerId: string,
  userId: string | null | undefined,
): void {
  if (!isOwner(resourceOwnerId, userId)) {
    throw new AuthError("FORBIDDEN", "Accès refusé.");
  }
}
