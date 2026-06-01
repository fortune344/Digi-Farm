"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import {
  type ActionState,
  formString,
  zodToFieldErrors,
} from "@/lib/action-state";
import { deleteSessionCookie, getSessionCookie } from "@/lib/auth/cookies";
import { requireUser } from "@/lib/auth/dal";
import { invalidateSession } from "@/lib/auth/session";
import { profileSchema } from "@/lib/validation/auth";

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    nom: formString(formData.get("nom")),
    region: formString(formData.get("region")),
    telephone: formString(formData.get("telephone")),
  });

  if (!parsed.success) {
    return {
      error: "Veuillez corriger les champs indiqués.",
      fieldErrors: zodToFieldErrors(parsed.error),
    };
  }

  const { nom, region, telephone } = parsed.data;
  db.update(profiles)
    .set({ nom, region, telephone: telephone ?? null })
    .where(eq(profiles.userId, user.id))
    .run();

  revalidatePath("/profil");
  return { success: "Profil mis à jour." };
}

export async function logoutAction(): Promise<void> {
  const token = await getSessionCookie();
  if (token) invalidateSession(token);
  await deleteSessionCookie();
  redirect("/connexion");
}
