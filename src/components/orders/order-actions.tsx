"use client";

import { CheckCircle2, PackageCheck, Send, TriangleAlert } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  confirmReceptionAction,
  openDisputeAction,
  prepareOrderAction,
  shipOrderAction,
} from "@/app/commande/[id]/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { OrderStatut, SequestreStatut } from "@/lib/constants";

type Props = {
  orderId: string;
  isSeller: boolean;
  isBuyer: boolean;
  statut: OrderStatut;
  sequestre: SequestreStatut | null;
};

export function OrderActions({
  orderId,
  isSeller,
  isBuyer,
  statut,
  sequestre,
}: Props) {
  const [showDispute, setShowDispute] = useState(false);

  const canConfirm =
    isBuyer &&
    sequestre === "sequestre" &&
    (statut === "payee" || statut === "preparee" || statut === "expediee");
  const canDispute =
    statut === "payee" || statut === "preparee" || statut === "expediee";

  function confirmReception(e: FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        "Confirmer la réception ? Le paiement sera libéré vers le vendeur — action définitive.",
      )
    ) {
      e.preventDefault();
    }
  }

  return (
    <div className="space-y-3">
      {isSeller && statut === "payee" && (
        <form action={prepareOrderAction}>
          <input type="hidden" name="orderId" value={orderId} />
          <Button type="submit" size="lg" className="w-full">
            <PackageCheck className="size-4" />
            Marquer comme préparée
          </Button>
        </form>
      )}

      {isSeller && statut === "preparee" && (
        <form action={shipOrderAction}>
          <input type="hidden" name="orderId" value={orderId} />
          <Button type="submit" size="lg" className="w-full">
            <Send className="size-4" />
            Marquer comme expédiée / remise
          </Button>
        </form>
      )}

      {canConfirm && (
        <form action={confirmReceptionAction} onSubmit={confirmReception}>
          <input type="hidden" name="orderId" value={orderId} />
          <Button type="submit" size="lg" className="w-full">
            <CheckCircle2 className="size-4" />
            Confirmer la réception
          </Button>
        </form>
      )}

      {isBuyer && canDispute && (
        <>
          {!showDispute ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setShowDispute(true)}
            >
              <TriangleAlert className="size-4" />
              Signaler un problème
            </Button>
          ) : (
            <form
              action={openDisputeAction}
              className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
            >
              <input type="hidden" name="orderId" value={orderId} />
              <Textarea
                name="motif"
                rows={3}
                required
                placeholder="Décrivez le problème (produit non conforme, non reçu…)"
              />
              <div className="flex gap-2">
                <Button type="submit" variant="destructive" size="sm">
                  Ouvrir un litige
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDispute(false)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
