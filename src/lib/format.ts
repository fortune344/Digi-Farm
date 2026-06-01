const NUMBER_FR = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const INT_FR = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Prix en francs CFA, ex. 1500 → "1 500 FCFA". */
export function formatFCFA(value: number): string {
  return `${INT_FR.format(value)} FCFA`;
}

/** Prix unitaire, ex. 2.5 + "tonne" → "/ tonne" accolé au prix : "2,5 / tonne". */
export function formatQuantite(value: number, unite: string): string {
  return `${NUMBER_FR.format(value)} / ${unite}`;
}

/** Stock disponible, ex. 100 + "kg" → "100 kg". */
export function formatStock(value: number, unite: string): string {
  return `${NUMBER_FR.format(value)} ${unite}`;
}
