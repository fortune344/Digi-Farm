import { randomUUID } from "node:crypto";
import type {
  CheckoutParams,
  CheckoutResult,
  PaymentProvider,
  PayoutParams,
  PayoutResult,
} from "./provider";

// Agrégateur SIMULÉ : renvoie vers une page de paiement interne qui, à la
// validation, déclenche un webhook signé exactement comme le ferait un vrai
// agrégateur (PayIn → callback serveur→serveur signé). Sert à développer et
// TESTER le flux complet en attendant le vrai compte marchand.
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  createCheckout({ ref }: CheckoutParams): CheckoutResult {
    return { redirectUrl: `/paiement/mock/${ref}` };
  }

  // Reversement simulé : toujours accepté. Le vrai PayOut appellera l'API
  // de déboursement de l'agrégateur vers le mobile money de l'agriculteur.
  payout(_params: PayoutParams): PayoutResult {
    return { ok: true, payoutRef: `mock-payout-${randomUUID()}` };
  }
}
