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
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {listing.photos[0] ? (
          <Image
            src={listing.photos[0]}
            alt={listing.titre}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-8" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs font-medium text-muted-foreground">
          {listing.categorie}
        </p>
        <h3 className="line-clamp-1 font-semibold">{listing.titre}</h3>
        <p className="font-semibold text-primary">
          {formatFCFA(listing.prix)}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {formatQuantite(listing.quantiteDispo, listing.unite)}
          </span>
        </p>
        <div className="mt-auto flex items-center justify-between pt-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {listing.region}
          </span>
          {seller.note > 0 && <Stars value={seller.note} />}
        </div>
      </div>
    </Link>
  );
}
