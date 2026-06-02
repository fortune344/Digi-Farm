import { createHmac, timingSafeEqual } from "node:crypto";

// Signature HMAC-SHA256 du corps brut du webhook, partagée par l'agrégateur
// (ici simulé) et notre serveur. En prod, on remplace par le schéma de
// signature DOCUMENTÉ de l'agrégateur réel — voir docs/blueprints/paiement.md.
const SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET ?? "dev-mock-webhook-secret-change-me";

export const WEBHOOK_SIGNATURE_HEADER = "x-digifarm-signature";

export function signWebhookPayload(rawBody: string): string {
  return createHmac("sha256", SECRET).update(rawBody).digest("hex");
}

/** Vérifie la signature à temps constant. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
): boolean {
  if (!signature) return false;
  const expected = Buffer.from(signWebhookPayload(rawBody), "utf8");
  const provided = Buffer.from(signature, "utf8");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}
