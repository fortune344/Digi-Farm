import { ImageOff, Inbox, Pencil, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DeleteListingButton } from "@/components/listings/delete-listing-button";
import { StatutBadge } from "@/components/listings/statut-badge";
import { SequestreBadge } from "@/components/orders/sequestre-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ORDER_STATUT_LABELS } from "@/lib/constants";
import { formatFCFA, formatStock } from "@/lib/format";
import { getListingsByOwner } from "@/lib/listings/queries";
import { getOrdersBySeller } from "@/lib/orders/queries";
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
  const orders = getOrdersBySeller(userId).filter(
    (o) => o.order.statut !== "en_attente_paiement",
  );
  const aTraiter = orders.filter(
    (o) => o.order.statut === "payee" || o.order.statut === "preparee",
  ).length;

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

      {orders.length > 0 && (
        <Card className="mb-8 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="size-4 text-primary" />
              Commandes reçues
              {aTraiter > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  {aTraiter} à traiter
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {orders.map(({ order, payment, item }) => (
                <li key={order.id}>
                  <Link
                    href={`/commande/${order.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-primary"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {item?.titre ?? "Commande"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ORDER_STATUT_LABELS[order.statut]}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <SequestreBadge statut={payment.statutSequestre} />
                      <span className="font-semibold">
                        {formatFCFA(order.total)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <h2 className="mb-4 font-display text-xl font-semibold tracking-tight">
        Mes annonces
      </h2>

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
