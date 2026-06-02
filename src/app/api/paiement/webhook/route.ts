import { processPaymentEvent } from "@/lib/orders/queries";
import {
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
} from "@/lib/payments/webhook";

// Webhook de l'agrégateur (signé). Public, mais protégé par signature HMAC.
// Le passage du séquestre à "collecté/séquestré" se fait UNIQUEMENT ici,
// côté serveur, jamais via le front. Idempotent + montant vérifié.
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get(WEBHOOK_SIGNATURE_HEADER);

  if (!verifyWebhookSignature(raw, signature)) {
    return Response.json({ error: "signature invalide" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "corps JSON invalide" }, { status: 400 });
  }

  const ref = body.ref;
  if (typeof ref !== "string") {
    return Response.json({ error: "ref manquante" }, { status: 400 });
  }

  const result = processPaymentEvent({
    ref,
    amount: Number(body.amount),
    status: String(body.status),
    methode: typeof body.methode === "string" ? body.methode : null,
  });

  return Response.json({ message: result.message }, { status: result.status });
}
