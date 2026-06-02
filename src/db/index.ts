import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// Client de base de données — UNIQUEMENT côté serveur.
// SQLite ne tourne pas dans le navigateur : ne jamais importer ce module
// depuis un composant client. Voir docs/blueprints/autorisation.md.
const dbPath = process.env.DATABASE_URL ?? "./data/digifarm.db";

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000"); // évite les "database is locked" sous accès concurrent

export const db = drizzle(sqlite, { schema });
