import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import {
  CATEGORIES,
  LISTING_STATUTS,
  MODE_LIVRAISONS,
  ORDER_STATUTS,
  PAYMENT_METHODS,
  REGIONS,
  ROLES,
  SEQUESTRE_STATUTS,
  UNITES,
} from "@/lib/constants";

// Rappel : pas de RLS sous SQLite — l'isolation se fait côté serveur
// (voir docs/blueprints/autorisation.md).

// Identifiants de connexion. Données sensibles : ne jamais exposer passwordHash.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Profil métier, lié 1-1 à un utilisateur. Le rôle vit ICI (côté serveur).
export const profiles = sqliteTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ROLES }).notNull(),
  nom: text("nom").notNull(),
  telephone: text("telephone"),
  region: text("region", { enum: REGIONS }).notNull(),
  verifie: integer("verifie", { mode: "boolean" }).notNull().default(false),
  noteMoyenne: real("note_moyenne").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Sessions applicatives. L'id stocké = SHA-256 du token déposé dans le cookie,
// pour qu'une fuite de la base ne permette pas d'usurper une session.
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

// Annonces publiées par les agriculteurs.
// photos = tableau JSON de chemins publics (ex. "/uploads/listings/<id>/<fichier>.webp").
// prix exprimé en FCFA (entier, pas de centimes pour le XOF).
export const listings = sqliteTable("listings", {
  id: text("id").primaryKey(),
  agriculteurId: text("agriculteur_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  titre: text("titre").notNull(),
  categorie: text("categorie", { enum: CATEGORIES }).notNull(),
  description: text("description").notNull(),
  photos: text("photos", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  prix: integer("prix").notNull(),
  unite: text("unite", { enum: UNITES }).notNull(),
  quantiteDispo: real("quantite_dispo").notNull(),
  region: text("region", { enum: REGIONS }).notNull(),
  statut: text("statut", { enum: LISTING_STATUTS }).notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Commande : une par couple acheteur↔agriculteur (achat mono-vendeur).
// total et prix sont en FCFA (entiers). Voir docs/blueprints/paiement.md.
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  acheteurId: text("acheteur_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  agriculteurId: text("agriculteur_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  statut: text("statut", { enum: ORDER_STATUTS })
    .notNull()
    .default("en_attente_paiement"),
  total: integer("total").notNull(),
  modeLivraison: text("mode_livraison", { enum: MODE_LIVRAISONS }).notNull(),
  adresseLivraison: text("adresse_livraison"),
  litigeMotif: text("litige_motif"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Lignes de commande : on fige un instantané (titre + prix) au moment de l'achat.
export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  listingId: text("listing_id").references(() => listings.id, {
    onDelete: "set null",
  }),
  titre: text("titre").notNull(),
  prixUnitaire: integer("prix_unitaire").notNull(),
  quantite: real("quantite").notNull(),
});

// Paiement (1-1 avec la commande). refAgregateur UNIQUE = clé d'idempotence.
export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .unique()
    .references(() => orders.id, { onDelete: "cascade" }),
  montant: integer("montant").notNull(),
  fraisCommission: integer("frais_commission").notNull(),
  statutSequestre: text("statut_sequestre", { enum: SEQUESTRE_STATUTS })
    .notNull()
    .default("en_attente"),
  refAgregateur: text("ref_agregateur").notNull().unique(),
  methode: text("methode", { enum: PAYMENT_METHODS }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Journal d'audit : une ligne par transition d'état du séquestre (qui, quand, montant).
export const paymentAudit = sqliteTable("payment_audit", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id")
    .notNull()
    .references(() => payments.id, { onDelete: "cascade" }),
  fromStatut: text("from_statut"),
  toStatut: text("to_statut").notNull(),
  acteur: text("acteur").notNull(),
  montant: integer("montant"),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type PaymentAudit = typeof paymentAudit.$inferSelect;
