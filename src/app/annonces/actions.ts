"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type ActionState,
  formString,
  zodToFieldErrors,
} from "@/lib/action-state";
import { requireRole } from "@/lib/auth/dal";
import { MAX_PHOTOS } from "@/lib/constants";
import { computeKeptPhotos, isWithinPhotoLimit } from "@/lib/listings/photos";
import {
  deleteListingRow,
  getListingById,
  insertListing,
  updateListingRow,
} from "@/lib/listings/queries";
import {
  deleteListingDir,
  isValidImageFile,
  deleteListingPhotos as removeFiles,
  saveListingPhotos,
} from "@/lib/uploads";
import { editListingSchema, listingSchema } from "@/lib/validation/listing";

const PHOTO_ERROR =
  "Images non supportées (JPEG, PNG, WebP ou AVIF, 10 Mo max par photo).";

function extractImageFiles(formData: FormData): File[] {
  return formData
    .getAll("photos")
    .filter((v): v is File => v instanceof File && v.size > 0);
}

function readListingFields(formData: FormData) {
  return {
    titre: formString(formData.get("titre")),
    categorie: formString(formData.get("categorie")),
    description: formString(formData.get("description")),
    prix: formString(formData.get("prix")),
    unite: formString(formData.get("unite")),
    quantiteDispo: formString(formData.get("quantiteDispo")),
    region: formString(formData.get("region")),
  };
}

export async function createListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("agriculteur");
  const values = readListingFields(formData);
  const files = extractImageFiles(formData);

  const parsed = listingSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: "Veuillez corriger les champs indiqués.",
      fieldErrors: zodToFieldErrors(parsed.error),
      values,
    };
  }

  if (files.length > MAX_PHOTOS) {
    return { error: `Maximum ${MAX_PHOTOS} photos.`, values };
  }
  if (files.some((file) => !isValidImageFile(file))) {
    return { error: PHOTO_ERROR, values };
  }

  const id = randomUUID();
  const photos = await saveListingPhotos(id, files);
  insertListing({ id, agriculteurId: user.id, ...parsed.data, photos });

  redirect("/tableau-de-bord");
}

export async function updateListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("agriculteur");
  const id = formString(formData.get("id"));

  const existing = getListingById(id);
  if (!existing) return { error: "Annonce introuvable." };
  // Autorisation : seul le propriétaire peut modifier son annonce.
  if (existing.agriculteurId !== user.id) redirect("/tableau-de-bord");

  const values = readListingFields(formData);
  const parsed = editListingSchema.safeParse({
    ...values,
    statut: formString(formData.get("statut")),
  });
  if (!parsed.success) {
    return {
      error: "Veuillez corriger les champs indiqués.",
      fieldErrors: zodToFieldErrors(parsed.error),
      values,
    };
  }

  const toRemove = formData
    .getAll("removePhotos")
    .map((v) => String(v))
    .filter((p) => existing.photos.includes(p));
  const kept = computeKeptPhotos(existing.photos, toRemove);
  const newFiles = extractImageFiles(formData);

  if (!isWithinPhotoLimit(kept.length, newFiles.length)) {
    return { error: `Maximum ${MAX_PHOTOS} photos au total.`, values };
  }
  if (newFiles.some((file) => !isValidImageFile(file))) {
    return { error: PHOTO_ERROR, values };
  }

  const added = await saveListingPhotos(id, newFiles);
  updateListingRow(id, { ...parsed.data, photos: [...kept, ...added] });
  if (toRemove.length > 0) await removeFiles(toRemove);

  redirect("/tableau-de-bord");
}

export async function deleteListingAction(formData: FormData): Promise<void> {
  const user = await requireRole("agriculteur");
  const id = formString(formData.get("id"));

  const existing = getListingById(id);
  if (existing && existing.agriculteurId === user.id) {
    deleteListingRow(id);
    await deleteListingDir(id);
  }

  revalidatePath("/tableau-de-bord");
  redirect("/tableau-de-bord");
}
