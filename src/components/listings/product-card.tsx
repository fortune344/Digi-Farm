import { ImageOff, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Stars } from "@/components/ui/stars";
import { formatFCFA, formatQuantite } from "@/lib/format";
import type { PublicListing } from "@/lib/listings/public-queries";

export function ProductCard({ listing, seller }: PublicListing) {
  return (
    <Link
      href={`/produits/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {listing.photos[0] ? (
          <Image
            src={listing.photos[0]}
            alt={listing.titre}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-8" />
          </div>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground/80 shadow-sm backdrop-blur">
          {listing.categorie}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-semibold leading-snug transition-colors group-hover:text-primary">
          {listing.titre}
        </h3>

        <p className="text-lg font-bold text-primary">
          {formatFCFA(listing.prix)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {formatQuantite(listing.quantiteDispo, listing.unite)}
          </span>
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-sm text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{listing.region}</span>
          </span>
          {seller.note > 0 ? (
            <Stars value={seller.note} />
          ) : (
            <span className="text-xs">Nouveau</span>
          )}
        </div>
      </div>
    </Link>
  );
}
