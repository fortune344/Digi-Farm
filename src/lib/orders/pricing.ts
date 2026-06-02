import { COMMISSION_RATE } from "@/lib/constants";

// Calculs PURS (FCFA entiers) — testables, et toujours refaits CÔTÉ SERVEUR
// (jamais de confiance dans un total envoyé par le client).

export function computeTotal(prixUnitaire: number, quantite: number): number {
  return Math.round(prixUnitaire * quantite);
}

export function computeCommission(
  total: number,
  rate: number = COMMISSION_RATE,
): number {
  return Math.round(total * rate);
}

export function netToSeller(total: number, commission: number): number {
  return total - commission;
}
