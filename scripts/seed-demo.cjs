// Seed de démonstration : peuple le catalogue avec des produits réalistes.
// Télécharge de VRAIES photos (par mot-clé, via LoremFlickr + curl) et les
// compresse en WebP ; repli sur un visuel généré si un téléchargement échoue.
// Usage : node scripts/seed-demo.cjs [--clean]
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const Database = require("better-sqlite3");
const sharp = require("sharp");

sharp.cache(false); // évite les verrous de fichiers sous Windows

const ROOT = process.cwd();
const db = new Database(path.join(ROOT, "data", "digifarm.db"));
db.pragma("foreign_keys = ON");

const SELLERS = [
  {
    email: "demo.adjo@digifarm.test",
    nom: "Ferme Adjo",
    region: "Maritime",
    note: 4.6,
    verifie: 1,
  },
  {
    email: "demo.kara@digifarm.test",
    nom: "Coopérative Kara Verte",
    region: "Kara",
    note: 4.2,
    verifie: 1,
  },
  {
    email: "demo.kpalime@digifarm.test",
    nom: "Jardins de Kpalimé",
    region: "Plateaux",
    note: 4.8,
    verifie: 0,
  },
];

const uploadsRoot = path.join(ROOT, "public", "uploads", "listings");
for (const s of SELLERS) {
  const u = db.prepare("SELECT id FROM users WHERE email = ?").get(s.email);
  if (u) {
    for (const l of db
      .prepare("SELECT id FROM listings WHERE agriculteur_id = ?")
      .all(u.id)) {
      fs.rmSync(path.join(uploadsRoot, l.id), { recursive: true, force: true });
    }
  }
  db.prepare("DELETE FROM users WHERE email = ?").run(s.email);
}
db.prepare("DELETE FROM users WHERE email = ?").run(
  "demo.vendeur@digifarm.test",
);

if (process.argv.includes("--clean")) {
  console.log("Seed démo supprimé.");
  process.exit(0);
}

// --- Visuel généré (repli hors-ligne) ---
const THEME = {
  Céréales: ["#ca8a04", "#713f12"],
  Légumes: ["#16a34a", "#065f46"],
  "Tubercules & racines": ["#b45309", "#5b2c06"],
  Légumineuses: ["#65a30d", "#365314"],
  Fruits: ["#ea580c", "#7c2d12"],
  Oléagineux: ["#eab308", "#854d0e"],
  "Épices & condiments": ["#dc2626", "#7f1d1d"],
  Autres: ["#0d9488", "#134e4a"],
};
const escapeXml = (s) =>
  s.replace(
    /[<>&'"]/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[c],
  );
function wrap(title) {
  const words = title.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > 16) {
      lines.push(line.trim());
      line = w;
    } else line = (line + " " + w).trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}
async function makeCover(dir, titre, categorie) {
  const [c1, c2] = THEME[categorie] ?? THEME.Autres;
  const lines = wrap(titre);
  const tspans = lines
    .map(
      (l, i) =>
        `<tspan x="60" dy="${i === 0 ? 0 : 66}">${escapeXml(l)}</tspan>`,
    )
    .join("");
  const startY = 320 - (lines.length - 1) * 33;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect width="800" height="600" fill="url(#g)"/>
    <circle cx="660" cy="120" r="190" fill="rgba(255,255,255,0.12)"/>
    <text x="60" y="80" font-family="sans-serif" font-size="26" font-weight="600" fill="rgba(255,255,255,0.85)">${escapeXml(categorie)}</text>
    <text x="60" y="${startY}" font-family="sans-serif" font-size="58" font-weight="800" fill="#ffffff">${tspans}</text>
    <text x="60" y="560" font-family="sans-serif" font-size="24" font-weight="700" fill="rgba(255,255,255,0.9)">Digi-Farm</text>
  </svg>`;
  fs.mkdirSync(dir, { recursive: true });
  const name = `${randomUUID()}.webp`;
  await sharp(Buffer.from(svg))
    .webp({ quality: 82 })
    .toFile(path.join(dir, name));
  return name;
}

// --- Téléchargement d'une vraie photo (par mot-clé) ---
async function downloadPhoto(dir, kw, lock) {
  const tmp = path.join(os.tmpdir(), `df-${randomUUID()}`);
  const url = `https://loremflickr.com/800/600/${encodeURIComponent(kw)}?lock=${lock}`;
  try {
    execFileSync("curl", ["-sL", "--max-time", "30", "-o", tmp, url], {
      stdio: "ignore",
    });
    if (!fs.existsSync(tmp) || fs.statSync(tmp).size < 3000) return null;
    fs.mkdirSync(dir, { recursive: true });
    const name = `${randomUUID()}.webp`;
    await sharp(tmp)
      .rotate()
      .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(dir, name));
    return name;
  } catch {
    return null;
  } finally {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {}
  }
}

// [titre, categorie, region, prix, unite, quantite, sellerIndex, motsClésPhoto]
const PRODUCTS = [
  ["Maïs jaune en sac", "Céréales", "Kara", 18000, "sac", 50, 1, "corn,maize"],
  [
    "Riz local décortiqué",
    "Céréales",
    "Savanes",
    22000,
    "sac",
    30,
    1,
    "rice,grain",
  ],
  ["Mil rouge", "Céréales", "Savanes", 16000, "sac", 25, 1, "millet,grain"],
  [
    "Sorgho blanc",
    "Céréales",
    "Centrale",
    15000,
    "sac",
    20,
    1,
    "sorghum,cereal",
  ],
  ["Tomates fraîches", "Légumes", "Maritime", 500, "kg", 120, 0, "tomato"],
  ["Piment frais", "Légumes", "Maritime", 800, "kg", 60, 0, "chili,pepper"],
  ["Gombo frais", "Légumes", "Plateaux", 700, "kg", 80, 2, "okra"],
  ["Oignons rouges", "Légumes", "Savanes", 600, "kg", 200, 1, "onion"],
  ["Carottes", "Légumes", "Plateaux", 750, "kg", 90, 2, "carrot"],
  [
    "Igname Laboko",
    "Tubercules & racines",
    "Centrale",
    1200,
    "kg",
    300,
    1,
    "yam,tuber",
  ],
  [
    "Manioc frais",
    "Tubercules & racines",
    "Plateaux",
    300,
    "kg",
    400,
    2,
    "cassava",
  ],
  [
    "Patate douce",
    "Tubercules & racines",
    "Kara",
    450,
    "kg",
    150,
    1,
    "sweet,potato",
  ],
  ["Taro", "Tubercules & racines", "Plateaux", 500, "kg", 70, 2, "taro,root"],
  [
    "Haricot niébé",
    "Légumineuses",
    "Savanes",
    1000,
    "kg",
    100,
    1,
    "beans,cowpea",
  ],
  [
    "Arachides en coque",
    "Légumineuses",
    "Kara",
    900,
    "kg",
    120,
    1,
    "peanut,groundnut",
  ],
  ["Soja", "Légumineuses", "Centrale", 700, "kg", 200, 1, "soybean,soy"],
  [
    "Ananas pain de sucre",
    "Fruits",
    "Plateaux",
    400,
    "kg",
    250,
    2,
    "pineapple",
  ],
  ["Bananes douces", "Fruits", "Plateaux", 350, "kg", 180, 2, "banana"],
  ["Mangues mûres", "Fruits", "Centrale", 500, "kg", 140, 1, "mango"],
  ["Oranges juteuses", "Fruits", "Plateaux", 300, "kg", 220, 2, "orange,fruit"],
  ["Noix de palme", "Oléagineux", "Maritime", 250, "kg", 500, 0, "palm,fruit"],
  ["Sésame blanc", "Oléagineux", "Savanes", 1500, "kg", 60, 1, "sesame,seeds"],
  [
    "Gingembre frais",
    "Épices & condiments",
    "Plateaux",
    1200,
    "kg",
    40,
    2,
    "ginger",
  ],
  ["Ail local", "Épices & condiments", "Savanes", 2000, "kg", 30, 1, "garlic"],
  ["Miel naturel", "Autres", "Kara", 3500, "kg", 25, 1, "honey,jar"],
];

(async () => {
  const sellerIds = SELLERS.map(() => randomUUID());
  SELLERS.forEach((s, i) => {
    db.prepare(
      "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
    ).run(sellerIds[i], s.email, "x".repeat(32) + ":" + "y".repeat(128));
    db.prepare(
      "INSERT INTO profiles (user_id, role, nom, region, verifie, note_moyenne) VALUES (?, 'agriculteur', ?, ?, ?, ?)",
    ).run(sellerIds[i], s.nom, s.region, s.verifie, s.note);
  });

  const insert = db.prepare(
    "INSERT INTO listings (id, agriculteur_id, titre, categorie, description, photos, prix, unite, quantite_dispo, region, statut) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')",
  );

  let real = 0;
  let fallback = 0;
  let lock = 1;
  for (const [titre, categorie, region, prix, unite, qte, si, kw] of PRODUCTS) {
    const id = randomUUID();
    const dir = path.join(uploadsRoot, id);
    let name = await downloadPhoto(dir, kw, lock++);
    if (name) real++;
    else {
      name = await makeCover(dir, titre, categorie);
      fallback++;
    }
    const photos = JSON.stringify([`/uploads/listings/${id}/${name}`]);
    const desc = `${titre} de qualité, en provenance de la région ${region}. Récolte récente, disponible en gros et au détail. Contactez le vendeur pour la livraison ou le retrait.`;
    insert.run(
      id,
      sellerIds[si],
      titre,
      categorie,
      desc,
      photos,
      prix,
      unite,
      qte,
      region,
    );
    process.stdout.write(name ? "." : "x");
  }

  console.log(
    `\nSeed OK : ${SELLERS.length} vendeurs, ${PRODUCTS.length} annonces (${real} vraies photos, ${fallback} visuels générés).`,
  );
})();
