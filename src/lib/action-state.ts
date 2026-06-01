import type { ZodError } from "zod";

// État renvoyé par les server actions, consommé côté client via useActionState.
export type ActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  // Valeurs ressaisies, renvoyées en cas d'erreur (le mot de passe n'est jamais renvoyé).
  values?: Record<string, string>;
};

export const initialActionState: ActionState = {};

/** Récupère une valeur de FormData en chaîne (les champs manquants → ""). */
export function formString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/** Convertit les erreurs zod en map { champ: message } (premier message par champ). */
export function zodToFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
