// Extrait les tracés SVG de lucide-react vers un registre Python.
// Évite d'inventer des `d="..."` à la main (source d'icônes cassées).
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const NOMS = [
  // navigation & marque
  "sprout", "store", "layout-dashboard", "user", "user-round", "log-out", "menu", "x",
  "search", "sliders-horizontal", "chevron-right", "chevron-down", "arrow-right", "arrow-left",
  // actions
  "plus", "pencil", "trash-2", "eye", "upload", "image-off", "camera", "check", "copy",
  // tableau de bord & métriques
  "wallet", "banknote", "trending-up", "coins", "hand-coins", "package", "package-check",
  "truck", "clock", "inbox", "shopping-basket", "chart-column", "boxes", "list-checks",
  // états
  "circle-check", "circle-check-big", "circle-alert", "triangle-alert", "shield-check",
  "lock", "loader-circle", "info", "hourglass",
  // divers métier
  "star", "map-pin", "calendar", "phone", "mail", "leaf", "wheat", "external-link",
  "smartphone", "credit-card", "receipt", "message-circle", "scale",
  "send", "circle-x", "percent", "chevron-left", "shopping-cart", "badge-check",
  "clipboard-list", "funnel", "circle-help", "house",
];

const svg = [];
const manquants = [];

for (const nom of NOMS) {
  const url = pathToFileURL(
    `${process.cwd()}/node_modules/lucide-react/dist/esm/icons/${nom}.mjs`,
  ).href;
  try {
    const mod = await import(url);
    const interieur = mod.__iconNode
      .map(([balise, attrs]) => {
        const a = Object.entries(attrs)
          .filter(([k]) => k !== "key")
          .map(([k, v]) => `${k}="${v}"`)
          .join(" ");
        return `<${balise} ${a}/>`;
      })
      .join("");
    svg.push([nom, interieur]);
  } catch {
    manquants.push(nom);
  }
}

const entetes = `"""Registre d'icônes SVG (tracés issus de lucide, licence ISC).

FICHIER GÉNÉRÉ — ne pas éditer à la main.
Régénérer avec : node scripts/extraire-icones.mjs

Les icônes sont insérées en ligne dans le HTML : aucune requête réseau, aucun
JavaScript, et elles héritent de la couleur du texte (currentColor).
Utilisation dans un gabarit : {% icone "sprout" %} ou {% icone "truck" classe="size-5" %}
"""

ICONES: dict[str, str] = {
`;

const corps = svg.map(([nom, d]) => `    ${JSON.stringify(nom)}: ${JSON.stringify(d)},`).join("\n");
writeFileSync("digifarm/core/icones.py", `${entetes}${corps}\n}\n`, "utf8");

console.log(`${svg.length} icônes extraites`);
if (manquants.length) console.log("MANQUANTES :", manquants.join(", "));
