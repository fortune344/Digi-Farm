import { defineConfig } from "drizzle-kit";

// Configuration Drizzle pour SQLite (better-sqlite3).
// Le schéma vit dans src/db/schema.ts ; les migrations sont générées dans ./drizzle.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "./data/digifarm.db",
  },
});
