import { ImageOff, Pencil, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DeleteListingButton } from "@/components/listings/delete-listing-button";
import { StatutBadge } from "@/components/listings/statut-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatFCFA, formatStock } from "@/lib/format";
import { getListingsByOwner } from "@/lib/listings/queries";
import { cn } from "@/lib/utils";

export function SellerDashboard({
  userId,
  nom,
}: {
  userId: string;
  nom: string;
}) {
  const listings = getListingsByOwner(userId);
  const actives = listings.filter((l) => l.statut === "active").length;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Espace vendeur
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Bonjour {nom.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            {listings.length} annonce{listings.length > 1 ? "s" : ""} ·{" "}
            {actives} active{actives > 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/annonces/nouvelle" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          Nouvelle annonce
        </Link>
      </div>

      {listings.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 rounded-3xl py-16 text-center">
          <p className="text-muted-foreground">
            Publiez votre première annonce pour commencer à vendre.
          </p>
          <Link href="/annonces/nouvelle" className={cn(buttonVariants())}>
            <Plus className="size-4" />
            Créer une annonce
          </Link>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Card
              key={listing.id}
              className="flex flex-col overflow-hidden rounded-2xl"
            >
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
                <div className="absolute left-2.5 top-2.5">
                  <StatutBadge statut={listing.statut} />
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-1 p-4">
                <h2 className="line-clamp-1 font-semibold">{listing.titre}</h2>
                <p className="text-sm text-muted-foreground">
                  {listing.categorie} · {listing.region}
                </p>
                <p className="mt-1 font-semibold text-primary">
                  {formatFCFA(listing.prix)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {listing.unite}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Stock : {formatStock(listing.quantiteDispo, listing.unite)}
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
    </>
  );
}
