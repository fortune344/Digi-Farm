"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { CATEGORIES, REGIONS } from "@/lib/constants";

const SORT_OPTIONS = [
  { value: "recent", label: "Plus récentes" },
  { value: "prix_asc", label: "Prix croissant" },
  { value: "prix_desc", label: "Prix décroissant" },
];

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = (key: string) => searchParams.get(key) ?? "";
  const hasFilters = ["q", "categorie", "region", "sort"].some((k) =>
    searchParams.get(k),
  );

  function update(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page"); // tout changement de filtre revient page 1
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="hidden items-center gap-1.5 pr-1 text-sm font-medium text-muted-foreground sm:inline-flex">
        <SlidersHorizontal className="size-4" />
        Filtrer
      </span>

      <Select
        aria-label="Catégorie"
        value={current("categorie")}
        onChange={(e) => update({ categorie: e.target.value })}
        className="h-10 w-auto min-w-40 flex-1 sm:flex-none"
      >
        <option value="">Toutes catégories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Région"
        value={current("region")}
        onChange={(e) => update({ region: e.target.value })}
        className="h-10 w-auto min-w-36 flex-1 sm:flex-none"
      >
        <option value="">Toutes régions</option>
        {REGIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Trier"
        value={current("sort") || "recent"}
        onChange={(e) => update({ sort: e.target.value })}
        className="h-10 w-auto min-w-40 flex-1 sm:flex-none"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="inline-flex h-10 items-center gap-1 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
          Réinitialiser
        </button>
      )}
    </div>
  );
}
