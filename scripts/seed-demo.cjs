// Seed de démonstration : peuple le catalogue avec des produits réalistes.
// Images : photo pertinente via l'API de recherche Wikimedia Commons (requête
// curée par produit), compressée en WebP ; repli sur un visuel généré si échec.
// Usage : node scripts/seed-demo.cjs [--clean] [--dry-run]
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const Database = require("better-sqlite3");
const sharp = require("sharp");

sharp.cache(false);
const UA = "Digi-Farm-Seed/1.0 (demo; contact@digifarm.test)";
const ROOT = process.cwd();
const DRY = process.argv.includes("--dry-run");

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

function cleanup() {
  for (const s of SELLERS) {
    const u = db.prepare("SELECT id FROM users WHERE email = ?").get(s.email);
    if (u) {
      for (const l of db
        .prepare("SELECT id FROM listings WHERE agriculteur_id = ?")
        .all(u.id)) {
        fs.rmSync(path.join(uploadsRoot, l.id), {
          recursive: true,
          force: true,
        });
      }
    }
    db.prepare("DELETE FROM users WHERE email = ?").run(s.email);
  }
  db.prepare("DELETE FROM users WHERE email = ?").run(
    "demo.vendeur@digifarm.test",
  );
}

if (process.argv.includes("--clean")) {
  cleanup();
  console.log("Seed démo supprimé.");
  process.exit(0);
}

// --- Visuel généré (repli) ---
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
function wrap(t) {
  const words = t.split(" ");
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><circle cx="660" cy="120" r="190" fill="rgba(255,255,255,0.12)"/><text x="60" y="80" font-family="sans-serif" font-size="26" font-weight="600" fill="rgba(255,255,255,0.85)">${escapeXml(categorie)}</text><text x="60" y="${startY}" font-family="sans-serif" font-size="58" font-weight="800" fill="#ffffff">${tspans}</text><text x="60" y="560" font-family="sans-serif" font-size="24" font-weight="700" fill="rgba(255,255,255,0.9)">Digi-Farm</text></svg>`;
  fs.mkdirSync(dir, { recursive: true });
  const name = `${randomUUID()}.webp`;
  await sharp(Buffer.from(svg))
    .webp({ quality: 82 })
    .toFile(path.join(dir, name));
  return name;
}

// --- Résolution + téléchargement d'une photo Commons ---
// Mots indiquant une non-photo (document scanné, gravure, plat cuisiné, etc.).
const BAD =
  /page\d|bulletin|materials|postprandial|köhler|koeh|medizinal|pflanzen|woodwill|herbarium|specimen|botanical|rotting|sprouting|cooked|soup|stew|recipe|dish|curry|document|diagram|\bmap\b|illustration|drawing|antique|empty|ISS-|astronaut|18\d\d|19[0-5]\d/i;

function resolveCommonsUrl(query) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=1280&format=json`;
  try {
    const out = execFileSync(
      "curl",
      ["-sL", "--max-time", "25", "-H", `User-Agent: ${UA}`, api],
      { encoding: "utf8" },
    );
    const pages = JSON.parse(out)?.query?.pages;
    if (!pages) return null;
    const candidates = Object.values(pages)
      .map((p) => ({ index: p.index, title: p.title, ii: p.imageinfo?.[0] }))
      .filter((c) => c.ii && /^image\/(jpe?g|png)$/.test(c.ii.mime || ""))
      .sort((a, b) => a.index - b.index);
    for (const c of candidates) {
      const fname = decodeURIComponent((c.ii.url || "").split("/").pop() || "");
      if (BAD.test(fname) || BAD.test(c.title)) continue;
      if ((c.ii.width || 0) < 400) continue;
      return c.ii.thumburl || c.ii.url;
    }
    return candidates[0]?.ii?.thumburl || candidates[0]?.ii?.url || null;
  } catch {
    return null;
  }
}
// Surcharges : fichiers Commons explicites et vérifiés pour les produits dont
// la recherche automatique donnait des résultats hors-sujet.
const OVERRIDES = {
  "Riz local décortiqué": "20201102.Hengnan.Hybrid rice Sanyou-1.6.jpg",
  "Piment frais": "Madame Jeanette and other chillies.jpg",
  "Gombo frais": "Hong Kong Okra Aug 25 2012.JPG",
  Carottes: "Vegetable-Carrot-Bundle-wStalks.jpg",
  "Ananas pain de sucre": "Pineapples.jpg",
  "Miel naturel": "Small Honey Jar with Honeycomb.jpg",
};
function filePathUrl(name) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=1280`;
}
function photoUrlFor(titre, query) {
  return OVERRIDES[titre]
    ? filePathUrl(OVERRIDES[titre])
    : resolveCommonsUrl(query);
}

async function downloadToWebp(dir, url) {
  const tmp = path.join(os.tmpdir(), `df-${randomUUID()}`);
  try {
    execFileSync(
      "curl",
      ["-sL", "--max-time", "30", "-H", `User-Agent: ${UA}`, "-o", tmp, url],
      { stdio: "ignore" },
    );
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

// [titre, categorie, region, prix, unite, quantite, sellerIndex, requêtePhotoCommons]
const PRODUCTS = [
  [
    "Maïs jaune en sac",
    "Céréales",
    "Kara",
    18000,
    "sac",
    50,
    1,
    "corn on the cob sweet corn",
  ],
  [
    "Riz local décortiqué",
    "Céréales",
    "Savanes",
    22000,
    "sac",
    30,
    1,
    "white rice grains heap",
  ],
  [
    "Mil rouge",
    "Céréales",
    "Savanes",
    16000,
    "sac",
    25,
    1,
    "food grain pearl millet",
  ],
  [
    "Sorgho blanc",
    "Céréales",
    "Centrale",
    160000,
    "tonne",
    8,
    1,
    "sorghum grains",
  ],
  [
    "Tomates fraîches",
    "Légumes",
    "Maritime",
    500,
    "kg",
    120,
    0,
    "fresh tomatoes red",
  ],
  [
    "Piment frais",
    "Légumes",
    "Maritime",
    800,
    "kg",
    60,
    0,
    "red chili peppers",
  ],
  ["Gombo frais", "Légumes", "Plateaux", 700, "kg", 80, 2, "okra pods green"],
  ["Oignons rouges", "Légumes", "Savanes", 600, "kg", 200, 1, "red onions"],
  ["Carottes", "Légumes", "Plateaux", 750, "kg", 90, 2, "fresh carrots bunch"],
  [
    "Igname Laboko",
    "Tubercules & racines",
    "Centrale",
    1200,
    "kg",
    300,
    1,
    "yam tubers market",
  ],
  [
    "Manioc frais",
    "Tubercules & racines",
    "Plateaux",
    300,
    "kg",
    400,
    2,
    "manioc roots cassava",
  ],
  [
    "Patate douce",
    "Tubercules & racines",
    "Kara",
    450,
    "kg",
    150,
    1,
    "sweet potato tubers",
  ],
  [
    "Taro",
    "Tubercules & racines",
    "Plateaux",
    500,
    "kg",
    70,
    2,
    "taro corms root",
  ],
  [
    "Haricot niébé",
    "Légumineuses",
    "Savanes",
    14000,
    "sac",
    35,
    1,
    "cowpea beans dried",
  ],
  [
    "Arachides en coque",
    "Légumineuses",
    "Kara",
    13000,
    "sac",
    40,
    1,
    "peanuts in shell",
  ],
  ["Soja", "Légumineuses", "Centrale", 9000, "sac", 80, 1, "soybeans seeds"],
  [
    "Ananas pain de sucre",
    "Fruits",
    "Plateaux",
    400,
    "kg",
    250,
    2,
    "pineapple fruit whole",
  ],
  [
    "Bananes douces",
    "Fruits",
    "Plateaux",
    350,
    "kg",
    180,
    2,
    "bananas bunch ripe",
  ],
  [
    "Mangues mûres",
    "Fruits",
    "Centrale",
    500,
    "kg",
    140,
    1,
    "ripe mango fruit",
  ],
  [
    "Oranges juteuses",
    "Fruits",
    "Plateaux",
    300,
    "kg",
    220,
    2,
    "oranges fruit pile",
  ],
  [
    "Noix de palme",
    "Oléagineux",
    "Maritime",
    8000,
    "sac",
    60,
    0,
    "oil palm fruit bunch",
  ],
  [
    "Sésame blanc",
    "Oléagineux",
    "Savanes",
    1500,
    "kg",
    60,
    1,
    "white sesame seeds",
  ],
  [
    "Gingembre frais",
    "Épices & condiments",
    "Plateaux",
    1200,
    "kg",
    40,
    2,
    "fresh ginger root",
  ],
  [
    "Ail local",
    "Épices & condiments",
    "Savanes",
    2000,
    "kg",
    30,
    1,
    "garlic bulbs cloves",
  ],
  ["Miel naturel", "Autres", "Kara", 3500, "kg", 25, 1, "honey jar glass"],
];

(async () => {
  if (DRY) {
    console.log("DRY-RUN : résolution des photos (aucune écriture)\n");
    for (const [titre, , , , , , , query] of PRODUCTS) {
      const url = photoUrlFor(titre, query);
      const file = url
        ? decodeURIComponent(url.split("/").pop()).replace(/\?width=1280$/, "")
        : "AUCUNE";
      const tag = OVERRIDES[titre] ? "[choisi]" : "[recherche]";
      console.log(`${titre.padEnd(24)} ${tag} -> ${file.slice(0, 52)}`);
    }
    process.exit(0);
  }

  cleanup();
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

  let real = 0,
    fallback = 0;
  for (const [
    titre,
    categorie,
    region,
    prix,
    unite,
    qte,
    si,
    query,
  ] of PRODUCTS) {
    const id = randomUUID();
    const dir = path.join(uploadsRoot, id);
    const url = photoUrlFor(titre, query);
    let name = url ? await downloadToWebp(dir, url) : null;
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
    process.stdout.write(name && url ? "." : "x");
  }
  console.log(
    `\nSeed OK : ${SELLERS.length} vendeurs, ${PRODUCTS.length} annonces (${real} photos Commons, ${fallback} visuels générés).`,
  );
})();
