// Seed de démonstration (temporaire) pour tester le catalogue au runtime.
// Usage : node scripts/seed-demo.cjs [--clean]
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const Database = require("better-sqlite3");

const db = new Database(path.join(process.cwd(), "data", "digifarm.db"));
db.pragma("foreign_keys = ON");

const DEMO_EMAIL = "demo.vendeur@digifarm.test";

// Toujours repartir propre (cascade supprime profil + annonces).
db.prepare("DELETE FROM users WHERE email = ?").run(DEMO_EMAIL);

if (process.argv.includes("--clean")) {
  console.log("Seed démo supprimé.");
  process.exit(0);
}

const userId = randomUUID();
db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(
  userId,
  DEMO_EMAIL,
  "x".repeat(32) + ":" + "y".repeat(128),
);
db.prepare(
  "INSERT INTO profiles (user_id, role, nom, region, verifie, note_moyenne) VALUES (?, 'agriculteur', ?, 'Maritime', 1, 4.5)",
).run(userId, "Ferme Démo Adjo");

const listings = [
  ["Tomates fraîches de saison", "Légumes", "Maritime", 500, "kg", 120],
  ["Maïs jaune en sac", "Céréales", "Kara", 18000, "sac", 40],
];
const ids = [];
const insert = db.prepare(
  "INSERT INTO listings (id, agriculteur_id, titre, categorie, description, photos, prix, unite, quantite_dispo, region, statut) VALUES (?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, 'active')",
);
for (const [titre, categorie, region, prix, unite, qte] of listings) {
  const id = randomUUID();
  insert.run(
    id,
    userId,
    titre,
    categorie,
    `${titre} — produit de qualité.`,
    prix,
    unite,
    qte,
    region,
  );
  ids.push(id);
}

console.log("LISTING_IDS=" + ids.join(","));
