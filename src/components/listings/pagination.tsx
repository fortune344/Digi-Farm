import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PER_PAGE, type SearchParams } from "@/lib/listings/public-queries";
import { cn } from "@/lib/utils";

function hrefFor(params: SearchParams, page: number): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.categorie) query.set("categorie", params.categorie);
  if (params.region) query.set("region", params.region);
  if (params.sort !== "recent") query.set("sort", params.sort);
  if (page > 1) query.set("page", String(page));
  const qs = query.toString();
  return qs ? `/?${qs}` : "/";
}

export function Pagination({
  params,
  total,
}: {
  params: SearchParams;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (totalPages <= 1) return null;

  const { page } = params;
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav className="mt-10 flex items-center justify-center gap-4">
      {prevDisabled ? (
        <span
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "pointer-events-none opacity-50",
          )}
        >
          <ChevronLeft className="size-4" />
          Précédent
        </span>
      ) : (
        <Link
          href={hrefFor(params, page - 1)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <ChevronLeft className="size-4" />
          Précédent
        </Link>
      )}

      <span className="text-sm text-muted-foreground">
        Page {page} sur {totalPages}
      </span>

      {nextDisabled ? (
        <span
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "pointer-events-none opacity-50",
          )}
        >
          Suivant
          <ChevronRight className="size-4" />
        </span>
      ) : (
        <Link
          href={hrefFor(params, page + 1)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Suivant
          <ChevronRight className="size-4" />
        </Link>
      )}
    </nav>
  );
}
