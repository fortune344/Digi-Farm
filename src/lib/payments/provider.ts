import "server-only";
import { MockPaymentProvider } from "./mock-provider";

export type CheckoutParams = {
  ref: string;
  amount: number;
  orderId: string;
};
export type CheckoutResult = { redirectUrl: string };

export interface PaymentProvider {
  readonly name: string;
  createCheckout(params: CheckoutParams): CheckoutResult;
}

// Sélection de l'agrégateur de paiement.
// Aujourd'hui : agrégateur SIMULÉ (sandbox local), faute de compte marchand.
// Demain : brancher CinetPay / FedaPay / Hub2 ici, en implémentant
// PaymentProvider contre leur API DOCUMENTÉE (voir docs/blueprints/paiement.md).
// NE PAS inventer d'endpoint : lire la doc officielle avant.
export function getPaymentProvider(): PaymentProvider {
  return new MockPaymentProvider();
}
