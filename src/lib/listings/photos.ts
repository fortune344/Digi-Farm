import { MAX_PHOTOS } from "@/lib/constants";

// Helpers PURS de gestion des photos (sans I/O) → testables unitairement.

/** Photos existantes à conserver = existantes moins celles à supprimer. */
export function computeKeptPhotos(
  existing: string[],
  toRemove: string[],
): string[] {
  const remove = new Set(toRemove);
  return existing.filter((path) => !remove.has(path));
}

/** Vrai si le total (conservées + nouvelles) respecte la limite. */
export function isWithinPhotoLimit(
  keptCount: number,
  newCount: number,
  max: number = MAX_PHOTOS,
): boolean {
  const total = keptCount + newCount;
  return total >= 0 && total <= max;
}
