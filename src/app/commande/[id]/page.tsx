import { CheckCircle2, MapPin, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SequestreBadge } from "@/components/orders/sequestre-badge";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { MODE_LIVRAISON_LABELS, ORDER_STATUT_LABELS } from "@/lib/constants";
import { formatFCFA } from "@/lib/format";
import { getOrderDetail } from "@/lib/orders/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ma commande — Digi-Farm" };

export default async function CommandePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const detail = getOrderDetail(id);
  if (!detail) notFound();

  const { order, payment, items } = detail;
  const isParticipant =
    user.id === order.acheteurId ||
    user.id === order.agriculteurId ||
    user.profile.role === "admin";
  if (!isParticipant) redirect("/");

  const enAttente = payment?.statutSequestre === "en_attente";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        {!enAttente && payment && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-primary/30 bg-accent px-4 py-3 text-accent-foreground">
            <CheckCircle2 className="size-5 shrink-0 text-primary" />
            <p className="text-sm font-medium">
              Paiement reçu — votre argent est sous séquestre jusqu'à la
              réception de la commande.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Commande
          </h1>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {ORDER_STATUT_LABELS[order.statut]}
            </span>
            {payment && <SequestreBadge statut={payment.statutSequestre} />}
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Réf. {order.id.slice(0, 8).toUpperCase()}
        </p>

        <Card className="mt-6 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Articles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <p className="font-medium">{it.titre}</p>
                  <p className="text-muted-foreground">
                    Qté {it.quantite} × {formatFCFA(it.prixUnitaire)}
                  </p>
                </div>
                <p className="font-medium">
                  {formatFCFA(Math.round(it.prixUnitaire * it.quantite))}
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-3">
              <span className="font-medium">Total</span>
              <span className="text-lg font-bold text-primary">
                {formatFCFA(order.total)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Livraison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Truck className="size-4" />
              {MODE_LIVRAISON_LABELS[order.modeLivraison]}
            </p>
            {order.adresseLivraison && (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                {order.adresseLivraison}
              </p>
            )}
          </CardContent>
        </Card>

        {enAttente && payment ? (
          <div className="mt-6">
            <Link
              href={`/paiement/mock/${payment.refAgregateur}`}
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
            >
              Payer maintenant
            </Link>
          </div>
        ) : (
          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            Le vendeur sera payé après votre confirmation de réception (à
            venir).
          </p>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/tableau-de-bord"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Voir mes commandes
          </Link>
        </div>
      </main>
    </>
  );
}
