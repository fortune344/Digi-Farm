import "server-only";
import { and, asc, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { type Listing, listings, profiles } from "@/db/schema";
import { PER_PAGE, type SearchParams } from "./search-params";

export {
  PER_PAGE,
  parseSearchParams,
  type SearchParams,
  SORTS,
  type Sort,
} from "./search-params";

export type PublicListing = {
  listing: Listing;
  seller: { nom: string; verifie: boolean; note: number };
};

const SELLER = {
  nom: profiles.nom,
  verifie: profiles.verifie,
  note: profiles.noteMoyenne,
};

function buildWhere(params: SearchParams): SQL | undefined {
  // Seules les annonces actives sont visibles publiquement.
  const conditions: SQL[] = [eq(listings.statut, "active")];
  if (params.categorie)
    conditions.push(eq(listings.categorie, params.categorie));
  if (params.region) conditions.push(eq(listings.region, params.region));
  if (params.q) {
    const pattern = `%${params.q}%`;
    const search = or(
      like(listings.titre, pattern),
      like(listings.description, pattern),
    );
    if (search) conditions.push(search);
  }
  return and(...conditions);
}

export function getPublicListings(params: SearchParams): {
  items: PublicListing[];
  total: number;
} {
  const where = buildWhere(params);
  const orderBy =
    params.sort === "prix_asc"
      ? asc(listings.prix)
      : params.sort === "prix_desc"
        ? desc(listings.prix)
        : desc(listings.createdAt);

  const items = db
    .select({ listing: listings, seller: SELLER })
    .from(listings)
    .innerJoin(profiles, eq(profiles.userId, listings.agriculteurId))
    .where(where)
    .orderBy(orderBy)
    .limit(PER_PAGE)
    .offset((params.page - 1) * PER_PAGE)
    .all();

  const total =
    db.select({ value: count() }).from(listings).where(where).get()?.value ?? 0;

  return { items, total };
}

export function getPublicListingById(id: string): PublicListing | null {
  const row = db
    .select({ listing: listings, seller: SELLER })
    .from(listings)
    .innerJoin(profiles, eq(profiles.userId, listings.agriculteurId))
    .where(eq(listings.id, id))
    .get();

  // Une annonce suspendue n'est pas consultable publiquement.
  if (!row || row.listing.statut === "suspendue") return null;
  return row;
}
