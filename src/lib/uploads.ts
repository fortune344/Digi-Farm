import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Stockage local des photos d'annonces, avec compression (connexion lente).
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "listings");
const PUBLIC_PREFIX = "/uploads/listings";
const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo par fichier brut
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

/** Valide un fichier image (type et taille) avant traitement. */
export function isValidImageFile(file: File): boolean {
  return (
    file.size > 0 && file.size <= MAX_BYTES && ALLOWED_TYPES.has(file.type)
  );
}

/** Compresse en WebP (≤ 1280px, qualité 78) et écrit sur le disque. */
export async function saveListingPhotos(
  listingId: string,
  files: File[],
): Promise<string[]> {
  if (files.length === 0) return [];
  const dir = path.join(UPLOAD_ROOT, listingId);
  await mkdir(dir, { recursive: true });

  const saved: string[] = [];
  for (const file of files) {
    const input = Buffer.from(await file.arrayBuffer());
    const output = await sharp(input)
      .rotate() // respecte l'orientation EXIF
      .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    const name = `${randomUUID()}.webp`;
    await writeFile(path.join(dir, name), output);
    saved.push(`${PUBLIC_PREFIX}/${listingId}/${name}`);
  }
  return saved;
}

/** Supprime des fichiers photos à partir de leurs chemins publics. */
export async function deleteListingPhotos(
  publicPaths: string[],
): Promise<void> {
  await Promise.all(
    publicPaths.map(async (publicPath) => {
      // Garde-fou : ne toucher qu'aux fichiers du dossier d'uploads.
      if (!publicPath.startsWith(`${PUBLIC_PREFIX}/`)) return;
      const absolute = path.join(process.cwd(), "public", publicPath);
      try {
        await unlink(absolute);
      } catch {
        // déjà absent : on ignore
      }
    }),
  );
}

/** Supprime tout le dossier de photos d'une annonce. */
export async function deleteListingDir(listingId: string): Promise<void> {
  try {
    await rm(path.join(UPLOAD_ROOT, listingId), {
      recursive: true,
      force: true,
    });
  } catch {
    // rien à supprimer
  }
}
