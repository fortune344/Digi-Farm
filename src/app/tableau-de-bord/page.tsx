import { ImageOff, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DeleteListingButton } from "@/components/listings/delete-listing-button";
import { StatutBadge } from "@/components/listings/statut-badge";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/dal";
import { formatFCFA, formatQuantite } from "@/lib/format";
import { getListingsByOwner } from "@/lib/listings/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Mes annonces — Digi-Farm",
};

export default async function TableauDeBordPage() {
  const user = await requireRole("agriculteur");
  const listings = getListingsByOwner(user.id);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mes annonces</h1>
            <p className="mt-1 text-muted-foreground">
              {listings.length === 0
                ? "Vous n'avez pas encore d'annonce."
                : `${listings.length} annonce(s) publiée(s).`}
            </p>
          </div>
          <Link href="/annonces/nouvelle" className={cn(buttonVariants())}>
            <Plus className="size-4" />
            Nouvelle annonce
          </Link>
        </div>

        {listings.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-muted-foreground">
              Publiez votre première annonce pour commencer à vendre.
            </p>
            <Link href="/annonces/nouvelle" className={cn(buttonVariants())}>
              <Plus className="size-4" />
              Créer une annonce
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <Card key={listing.id} className="flex flex-col overflow-hidden">
                <div className="relative aspect-[4/3] bg-muted">
                  {listing.photos[0] ? (
                    <Image
                      src={listing.photos[0]}
                      alt={listing.titre}
                      fill
                      sizes="(max-width: 640px) 100vw, 320px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <ImageOff className="size-8" />
                    </div>
                  )}
                  <div className="absolute left-2 top-2">
                    <StatutBadge statut={listing.statut} />
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-1 p-4">
                  <h2 className="line-clamp-1 font-semibold">
                    {listing.titre}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {listing.categorie} · {listing.region}
                  </p>
                  <p className="mt-1 font-medium text-primary">
                    {formatFCFA(listing.prix)}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {formatQuantite(listing.quantiteDispo, listing.unite)}
                    </span>
                  </p>

                  <div className="mt-3 flex items-center gap-1 border-t pt-3">
                    <Link
                      href={`/annonces/${listing.id}/modifier`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                      )}
                    >
                      <Pencil className="size-4" />
                      Modifier
                    </Link>
                    <DeleteListingButton id={listing.id} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
