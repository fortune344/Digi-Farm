"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useId } from "react";
import { Input } from "@/components/ui/input";
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
  const searchId = useId();

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

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q");
    update({ q: typeof value === "string" ? value : "" });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onSearchSubmit} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={searchId}
          name="q"
          defaultValue={current("q")}
          placeholder="Rechercher un produit (tomates, maïs, ignames…)"
          className="pl-9"
        />
      </form>

      <div className="flex flex-wrap gap-2">
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
            className="inline-flex h-10 items-center gap-1 rounded-md px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
            Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
}
