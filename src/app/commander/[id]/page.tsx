import { ArrowLeft, ImageOff } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderForm } from "@/components/orders/order-form";
import { SiteHeader } from "@/components/site-header";
import { requireRole } from "@/lib/auth/dal";
import { formatFCFA } from "@/lib/format";
import { getListingById } from "@/lib/listings/queries";

export const metadata: Metadata = { title: "Commander — Digi-Farm" };

export default async function CommanderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("acheteur");
  const { id } = await params;
  const listing = getListingById(id);

  if (!listing || listing.statut !== "active") notFound();
  if (listing.agriculteurId === user.id) redirect(`/produits/${id}`);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <Link
          href={`/produits/${id}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour au produit
        </Link>

        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Finaliser la commande
        </h1>

        <div className="mt-6 flex items-center gap-4 rounded-2xl border bg-card p-4">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
            {listing.photos[0] ? (
              <Image
                src={listing.photos[0]}
                alt={listing.titre}
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <ImageOff className="size-6" />
              </div>
            )}
          </div>
          <div>
            <h2 className="font-semibold">{listing.titre}</h2>
            <p className="text-sm text-muted-foreground">
              {listing.categorie} · {listing.region}
            </p>
            <p className="mt-1 font-semibold text-primary">
              {formatFCFA(listing.prix)}
              <span className="text-xs font-normal text-muted-foreground">
                {" "}
                / {listing.unite}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-8">
          <OrderForm
            listingId={listing.id}
            prix={listing.prix}
            unite={listing.unite}
            quantiteDispo={listing.quantiteDispo}
          />
        </div>
      </main>
    </>
  );
}
