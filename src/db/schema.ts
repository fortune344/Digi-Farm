import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { REGIONS, ROLES } from "@/lib/constants";

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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Session = typeof sessions.$inferSelect;
