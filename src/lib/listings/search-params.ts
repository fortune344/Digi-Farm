import {
  CATEGORIES,
  type Categorie,
  REGIONS,
  type Region,
} from "@/lib/constants";

// Module PUR (sans I/O) : parsing des paramètres de recherche → testable.

export const SORTS = ["recent", "prix_asc", "prix_desc"] as const;
export type Sort = (typeof SORTS)[number];
export const PER_PAGE = 12;

export type SearchParams = {
  q?: string;
  categorie?: Categorie;
  region?: Region;
  sort: Sort;
  page: number;
};

/** Narrow les query params bruts (string | string[]) en filtres validés. */
export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): SearchParams {
  const get = (key: string): string | undefined => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const categorieRaw = get("categorie");
  const regionRaw = get("region");
  const sortRaw = get("sort");
  const pageRaw = Number.parseInt(get("page") ?? "1", 10);

  return {
    q: get("q")?.trim() || undefined,
    categorie: (CATEGORIES as readonly string[]).includes(categorieRaw ?? "")
      ? (categorieRaw as Categorie)
      : undefined,
    region: (REGIONS as readonly string[]).includes(regionRaw ?? "")
      ? (regionRaw as Region)
      : undefined,
    sort: (SORTS as readonly string[]).includes(sortRaw ?? "")
      ? (sortRaw as Sort)
      : "recent",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}
