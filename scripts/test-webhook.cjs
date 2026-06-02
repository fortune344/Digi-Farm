// Test E2E du webhook de paiement (serveur prod requis sur :3000).
// Vérifie : séquestre après webhook signé, idempotence, signature invalide,
// montant incohérent. Nettoie les commandes de test à la fin.
const path = require("node:path");
const { randomUUID, createHmac } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const Database = require("better-sqlite3");

const SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET || "dev-mock-webhook-secret-change-me";
const URL = "http://localhost:3000/api/paiement/webhook";
const db = new Database(path.join(process.cwd(), "data", "digifarm.db"));
db.pragma("foreign_keys = ON");

const sign = (body) => createHmac("sha256", SECRET).update(body).digest("hex");

function post(body, sig) {
  const out = execFileSync(
    "curl",
    [
      "-s",
      "-X",
      "POST",
      "-H",
      "content-type: application/json",
      "-H",
      `x-digifarm-signature: ${sig}`,
      "--data-binary",
      body,
      "-w",
      "\n%{http_code}",
      URL,
    ],
    { encoding: "utf8" },
  );
  const idx = out.lastIndexOf("\n");
  return { body: out.slice(0, idx), code: Number(out.slice(idx + 1)) };
}

const buyer = db
  .prepare(
    "SELECT u.id FROM users u JOIN profiles p ON p.user_id=u.id WHERE p.role='acheteur' LIMIT 1",
  )
  .get();
if (!buyer) {
  console.error("Aucun acheteur en base — crée un compte acheteur d'abord.");
  process.exit(1);
}
const listing = db
  .prepare("SELECT * FROM listings WHERE agriculteur_id != ? LIMIT 1")
  .get(buyer.id);

const createdOrders = [];
function makeOrder(montant) {
  const orderId = randomUUID();
  const ref = randomUUID();
  const paymentId = randomUUID();
  db.prepare(
    "INSERT INTO orders (id, acheteur_id, agriculteur_id, total, mode_livraison, statut) VALUES (?,?,?,?,'retrait','en_attente_paiement')",
  ).run(orderId, buyer.id, listing.agriculteur_id, montant);
  db.prepare(
    "INSERT INTO order_items (id, order_id, listing_id, titre, prix_unitaire, quantite) VALUES (?,?,?,?,?,?)",
  ).run(randomUUID(), orderId, listing.id, listing.titre, montant, 1);
  db.prepare(
    "INSERT INTO payments (id, order_id, montant, frais_commission, ref_agregateur, statut_sequestre) VALUES (?,?,?,?,?,'en_attente')",
  ).run(paymentId, orderId, montant, Math.round(montant * 0.05), ref);
  // Ligne d'audit de création (comme le fait le vrai createOrder).
  db.prepare(
    "INSERT INTO payment_audit (id, payment_id, from_statut, to_statut, acteur, montant, note) VALUES (?,?,NULL,'en_attente','system',?,'Commande créée')",
  ).run(randomUUID(), paymentId, montant);
  createdOrders.push(orderId);
  return { orderId, ref, paymentId };
}
const seq = (ref) =>
  db
    .prepare("SELECT statut_sequestre FROM payments WHERE ref_agregateur=?")
    .get(ref).statut_sequestre;
const orderStatut = (id) =>
  db.prepare("SELECT statut FROM orders WHERE id=?").get(id).statut;
const auditCount = (paymentId) =>
  db
    .prepare("SELECT count(*) c FROM payment_audit WHERE payment_id=?")
    .get(paymentId).c;

let pass = 0;
let fail = 0;
const check = (label, cond) => {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}`);
  }
};

// 1. Webhook signé valide -> séquestre + commande payée
const a = makeOrder(2000);
const payloadA = JSON.stringify({
  ref: a.ref,
  amount: 2000,
  status: "success",
  methode: "flooz",
});
const r1 = post(payloadA, sign(payloadA));
console.log("\n[1] Webhook valide :", r1.code, r1.body);
check("HTTP 200", r1.code === 200);
check("paiement = sequestre", seq(a.ref) === "sequestre");
check("commande = payee", orderStatut(a.orderId) === "payee");
check(
  "3 lignes d'audit (creation + collecte + sequestre)",
  auditCount(a.paymentId) === 3,
);

// 2. Idempotence : rejouer le même webhook
const r2 = post(payloadA, sign(payloadA));
console.log("\n[2] Rejeu (idempotence) :", r2.code, r2.body);
check("HTTP 200", r2.code === 200);
check(
  "toujours sequestre (pas de double traitement)",
  seq(a.ref) === "sequestre",
);
check("toujours 3 lignes d'audit", auditCount(a.paymentId) === 3);

// 3. Signature invalide -> 401, aucun changement
const b = makeOrder(3000);
const payloadB = JSON.stringify({
  ref: b.ref,
  amount: 3000,
  status: "success",
});
const r3 = post(payloadB, "signature-bidon");
console.log("\n[3] Signature invalide :", r3.code, r3.body);
check("HTTP 401", r3.code === 401);
check("paiement reste en_attente", seq(b.ref) === "en_attente");

// 4. Montant incohérent -> 400, aucun changement
const c = makeOrder(5000);
const payloadC = JSON.stringify({
  ref: c.ref,
  amount: 9999,
  status: "success",
});
const r4 = post(payloadC, sign(payloadC));
console.log("\n[4] Montant incoherent :", r4.code, r4.body);
check("HTTP 400", r4.code === 400);
check("paiement reste en_attente", seq(c.ref) === "en_attente");

// Nettoyage
for (const id of createdOrders)
  db.prepare("DELETE FROM orders WHERE id=?").run(id);
console.log(`\nRésultat : ${pass} OK, ${fail} échec(s).`);
process.exit(fail === 0 ? 0 : 1);
