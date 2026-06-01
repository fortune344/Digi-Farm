import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { type Listing, listings, type NewListing } from "@/db/schema";

export function getListingsByOwner(ownerId: string): Listing[] {
  return db
    .select()
    .from(listings)
    .where(eq(listings.agriculteurId, ownerId))
    .orderBy(desc(listings.createdAt))
    .all();
}

export function getListingById(id: string): Listing | null {
  return db.select().from(listings).where(eq(listings.id, id)).get() ?? null;
}

export function insertListing(value: NewListing): void {
  db.insert(listings).values(value).run();
}

export function updateListingRow(id: string, value: Partial<NewListing>): void {
  db.update(listings)
    .set({ ...value, updatedAt: new Date() })
    .where(eq(listings.id, id))
    .run();
}

export function deleteListingRow(id: string): void {
  db.delete(listings).where(eq(listings.id, id)).run();
}
