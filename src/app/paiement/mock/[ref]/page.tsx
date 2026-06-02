import { CheckCircle2, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requireUser } from "@/lib/auth/dal";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/constants";
import { formatFCFA } from "@/lib/format";
import { getOrderDetail, getPaymentByRef } from "@/lib/orders/queries";
import { cn } from "@/lib/utils";
import { confirmMockPaymentAction } from "./actions";

export const metadata: Metadata = { title: "Paiement — Digi-Farm" };

export default async function MockCheckoutPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const user = await requireUser();
  const { ref } = await params;
  const payment = getPaymentByRef(ref);
  if (!payment) notFound();

  const detail = getOrderDetail(payment.orderId);
  if (!detail || detail.order.acheteurId !== user.id) redirect("/marche");

  if (payment.statutSequestre !== "en_attente") {
    redirect(`/commande/${payment.orderId}`);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Lock className="size-4 text-primary" />
          Paiement sécurisé
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            Simulation
          </span>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">Montant à payer</p>
          <p className="mt-1 font-display text-4xl font-bold text-primary">
            {formatFCFA(payment.montant)}
          </p>
        </div>

        <form action={confirmMockPaymentAction} className="mt-8 space-y-4">
          <input type="hidden" name="ref" value={ref} />
          <div className="space-y-1.5">
            <Label htmlFor="methode">Moyen de paiement</Label>
            <Select id="methode" name="methode" defaultValue="flooz">
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </Select>
          </div>

          <Button
            type="submit"
            name="outcome"
            value="success"
            size="lg"
            className="w-full"
          >
            <CheckCircle2 className="size-4" />
            Payer {formatFCFA(payment.montant)}
          </Button>
          <Button
            type="submit"
            name="outcome"
            value="cancel"
            variant="ghost"
            className="w-full"
          >
            Annuler
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Environnement de démonstration — aucun argent réel n'est débité. Le
          vrai agrégateur (Flooz, Mixx, carte) sera branché ultérieurement.
        </p>

        <Link
          href="/marche"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mt-2 w-full",
          )}
        >
          Retour au marché
        </Link>
      </div>
    </main>
  );
}
