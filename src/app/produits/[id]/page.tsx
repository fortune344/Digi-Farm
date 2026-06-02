import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PhotoGallery } from "@/components/listings/photo-gallery";
import { StatutBadge } from "@/components/listings/statut-badge";
import { SiteHeader } from "@/components/site-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Stars } from "@/components/ui/stars";
import { getCurrentUser } from "@/lib/auth/dal";
import { formatFCFA, formatStock } from "@/lib/format";
import { getPublicListingById } from "@/lib/listings/public-queries";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = getPublicListingById(id);
  return {
    title: data ? `${data.listing.titre} — Digi-Farm` : "Produit — Digi-Farm",
  };
}

export default async function ProduitPage({ params }: Props) {
  const { id } = await params;
  const data = getPublicListingById(id);
  if (!data) notFound();

  const user = await getCurrentUser();
  const { listing, seller } = data;
  const epuise = listing.statut === "epuisee";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour au catalogue
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          <PhotoGallery photos={listing.photos} alt={listing.titre} />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {listing.categorie}
              </span>
              {epuise && <StatutBadge statut="epuisee" />}
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {listing.titre}
            </h1>

            <p className="mt-4 text-3xl font-bold text-primary">
              {formatFCFA(listing.prix)}
              <span className="ml-1 text-base font-normal text-muted-foreground">
                / {listing.unite}
              </span>
            </p>

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <PackageCheck className="size-4 text-muted-foreground" />
                <dt className="text-muted-foreground">Disponible :</dt>
                <dd className="font-medium">
                  {formatStock(listing.quantiteDispo, listing.unite)}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                <dt className="text-muted-foreground">Région :</dt>
                <dd className="font-medium">{listing.region}</dd>
              </div>
            </dl>

            <div className="mt-6 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {listing.description}
            </div>

            <Card className="mt-6">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="flex items-center gap-1.5 font-medium">
                    {seller.nom}
                    {seller.verifie && (
                      <BadgeCheck className="size-4 text-primary" />
                    )}
                  </p>
                  {seller.note > 0 ? (
                    <div className="mt-1 flex items-center gap-2">
                      <Stars value={seller.note} />
                      <span className="text-sm text-muted-foreground">
                        {seller.note.toFixed(1)}/5
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pas encore d'avis
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="mt-6">
              {epuise ? (
                <Button className="w-full" size="lg" disabled>
                  Produit épuisé
                </Button>
              ) : !user ? (
                <>
                  <Link
                    href="/connexion"
                    className={cn(buttonVariants({ size: "lg" }), "w-full")}
                  >
                    Se connecter pour commander
                  </Link>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Pas encore de compte ?{" "}
                    <Link
                      href="/inscription"
                      className="font-medium text-primary hover:underline"
                    >
                      Créer un compte
                    </Link>
                  </p>
                </>
              ) : user.profile.role === "acheteur" ? (
                <>
                  <Link
                    href={`/commander/${listing.id}`}
                    className={cn(buttonVariants({ size: "lg" }), "w-full")}
                  >
                    Commander
                  </Link>
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5 text-primary" />
                    Paiement séquestré jusqu'à réception.
                  </p>
                </>
              ) : (
                <>
                  <Button className="w-full" size="lg" disabled>
                    Commander
                  </Button>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Réservé aux comptes acheteurs.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
