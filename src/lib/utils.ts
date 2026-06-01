import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Fusionne des classes Tailwind de façon sûre (résout les conflits). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
