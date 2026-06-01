import { SearchX } from "lucide-react";
import { Suspense } from "react";
import { FilterBar } from "@/components/listings/filter-bar";
import { Pagination } from "@/components/listings/pagination";
import { ProductCard } from "@/components/listings/product-card";
import { SiteHeader } from "@/components/site-header";
import {
  getPublicListings,
  parseSearchParams,
} from "@/lib/listings/public-queries";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: Props) {
  const params = parseSearchParams(await searchParams);
  const { items, total } = getPublicListings(params);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b bg-gradient-to-b from-accent/60 to-background">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Le marché agricole du Togo, en ligne
              </h1>
              <p className="mt-3 text-muted-foreground">
                Trouvez des produits frais en direct des agriculteurs, près de
                chez vous.
              </p>
            </div>
            <div className="mx-auto mt-8 max-w-3xl rounded-xl border bg-card p-4 shadow-sm">
              <Suspense fallback={<div className="h-28" />}>
                <FilterBar />
              </Suspense>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <p className="mb-6 text-sm text-muted-foreground">
            {total} produit{total > 1 ? "s" : ""} disponible
            {total > 1 ? "s" : ""}
          </p>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-20 text-center">
              <SearchX className="size-10 text-muted-foreground" />
              <p className="font-medium">Aucun produit trouvé</p>
              <p className="text-sm text-muted-foreground">
                Essayez d'élargir votre recherche ou de retirer des filtres.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <ProductCard key={item.listing.id} {...item} />
              ))}
            </div>
          )}

          <Pagination params={params} total={total} />
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Digi-Farm — La marketplace agricole du
          Togo.
        </div>
      </footer>
    </>
  );
}
