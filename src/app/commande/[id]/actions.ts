"use server";

import { revalidatePath } from "next/cache";
import { formString } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/dal";
import {
  advanceOrderStatus,
  openDispute,
  releaseEscrowOnReception,
} from "@/lib/orders/queries";

function revalidate(orderId: string) {
  revalidatePath(`/commande/${orderId}`);
  revalidatePath("/tableau-de-bord");
}

export async function prepareOrderAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formString(formData.get("orderId"));
  advanceOrderStatus(id, user.id, "preparee");
  revalidate(id);
}

export async function shipOrderAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formString(formData.get("orderId"));
  advanceOrderStatus(id, user.id, "expediee");
  revalidate(id);
}

export async function confirmReceptionAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  const id = formString(formData.get("orderId"));
  releaseEscrowOnReception(id, user.id);
  revalidate(id);
}

export async function openDisputeAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formString(formData.get("orderId"));
  openDispute(id, user.id, formString(formData.get("motif")));
  revalidate(id);
}
