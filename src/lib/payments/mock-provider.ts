import type {
  CheckoutParams,
  CheckoutResult,
  PaymentProvider,
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
}
