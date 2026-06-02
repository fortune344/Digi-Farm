import type { SequestreStatut } from "@/lib/constants";

// Machine à états du séquestre (logique PURE, testable).
// Voir docs/blueprints/paiement.md :
// en_attente → collecte → sequestre → libere
//                              ↘ rembourse (litige tranché côté acheteur)
export const SEQUESTRE_TRANSITIONS: Record<
  SequestreStatut,
  readonly SequestreStatut[]
> = {
  en_attente: ["collecte", "rembourse"],
  collecte: ["sequestre", "rembourse"],
  sequestre: ["libere", "rembourse"],
  libere: [],
  rembourse: [],
};

export class EscrowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EscrowError";
  }
}

export function canTransition(
  from: SequestreStatut,
  to: SequestreStatut,
): boolean {
  return SEQUESTRE_TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: SequestreStatut,
  to: SequestreStatut,
): void {
  if (!canTransition(from, to)) {
    throw new EscrowError(
      `Transition de séquestre interdite : ${from} → ${to}`,
    );
  }
}
