import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Hachage de mot de passe via scrypt (intégré à Node, aucune dépendance native).
// Format stocké : "<salt hex>:<dérivé hex>".
const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(
    password.normalize("NFKC"),
    salt,
    KEY_LENGTH,
  )) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = (await scryptAsync(
    password.normalize("NFKC"),
    salt,
    KEY_LENGTH,
  )) as Buffer;
  const keyBuffer = Buffer.from(key, "hex");
  // Comparaison à temps constant pour éviter les attaques temporelles.
  if (keyBuffer.length !== derived.length) return false;
  return timingSafeEqual(keyBuffer, derived);
}
