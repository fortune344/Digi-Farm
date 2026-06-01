import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { createListingAction } from "@/app/annonces/actions";
import { ListingForm } from "@/components/listings/listing-form";
import { requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Nouvelle annonce — Digi-Farm",
};

export default async function NouvelleAnnoncePage() {
  await requireRole("agriculteur");

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/tableau-de-bord"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour au tableau de bord
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Publier une annonce</h1>
      <p className="mt-1 text-muted-foreground">
        Renseignez votre produit et ajoutez des photos.
      </p>
      <div className="mt-8">
        <ListingForm
          action={createListingAction}
          submitLabel="Publier l'annonce"
          cancelHref="/tableau-de-bord"
        />
      </div>
    </main>
  );
}
