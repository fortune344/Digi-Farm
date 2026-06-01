import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateListingAction } from "@/app/annonces/actions";
import { ListingForm } from "@/components/listings/listing-form";
import { requireRole } from "@/lib/auth/dal";
import { getListingById } from "@/lib/listings/queries";

export const metadata: Metadata = {
  title: "Modifier une annonce — Digi-Farm",
};

export default async function ModifierAnnoncePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("agriculteur");
  const { id } = await params;
  const listing = getListingById(id);

  if (!listing) notFound();
  // Autorisation : on ne peut éditer que ses propres annonces.
  if (listing.agriculteurId !== user.id) redirect("/tableau-de-bord");

  const defaults = {
    titre: listing.titre,
    categorie: listing.categorie,
    description: listing.description,
    prix: String(listing.prix),
    unite: listing.unite,
    quantiteDispo: String(listing.quantiteDispo),
    region: listing.region,
    statut: listing.statut,
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/tableau-de-bord"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour au tableau de bord
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Modifier l'annonce</h1>
      <div className="mt-8">
        <ListingForm
          action={updateListingAction}
          submitLabel="Enregistrer les modifications"
          cancelHref="/tableau-de-bord"
          defaults={defaults}
          existingPhotos={listing.photos}
          listingId={listing.id}
          showStatut
        />
      </div>
    </main>
  );
}
