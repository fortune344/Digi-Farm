import { Search, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilterBar } from "@/components/listings/filter-bar";
import { Pagination } from "@/components/listings/pagination";
import { ProductCard } from "@/components/listings/product-card";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import {
  getPublicListings,
  parseSearchParams,
} from "@/lib/listings/public-queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Le marché — Digi-Farm",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MarchePage({ searchParams }: Props) {
  const params = parseSearchParams(await searchParams);
  const { items, total } = getPublicListings(params);
  const filtered = Boolean(params.q || params.categorie || params.region);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-14">
        <div className="animate-fade-up">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Le marché
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {filtered ? "Résultats" : "Tous les produits frais"}
          </h1>

          <form
            action="/marche"
            method="get"
            className="mt-6 flex max-w-xl items-center gap-1.5 rounded-full border bg-card p-1.5 shadow-sm"
          >
            <Search className="ml-3 size-5 shrink-0 text-muted-foreground" />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Rechercher : tomates, maïs, ignames…"
              aria-label="Rechercher un produit"
              className="h-10 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
            >
              Rechercher
            </button>
          </form>
        </div>

        <div className="mb-6 mt-6 flex flex-wrap items-center justify-between gap-3">
          <Suspense fallback={<div className="h-11" />}>
            <FilterBar />
          </Suspense>
          <p className="text-sm text-muted-foreground">
            {total} produit{total > 1 ? "s" : ""}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border bg-card py-20 text-center">
            <SearchX className="size-10 text-muted-foreground" />
            <p className="font-medium">Aucun produit trouvé</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Essayez d'élargir votre recherche ou de retirer des filtres.
            </p>
            <Link
              href="/marche"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Voir tout le marché
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {items.map((item) => (
              <ProductCard key={item.listing.id} {...item} />
            ))}
          </div>
        )}

        <Pagination params={params} total={total} />
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Digi-Farm — La marketplace agricole du
          Togo.
        </div>
      </footer>
    </>
  );
}
