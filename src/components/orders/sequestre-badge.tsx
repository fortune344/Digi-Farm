import { SEQUESTRE_LABELS, type SequestreStatut } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STYLES: Record<SequestreStatut, string> = {
  en_attente: "bg-muted text-muted-foreground",
  collecte: "bg-blue-100 text-blue-700",
  sequestre: "bg-primary/10 text-primary",
  libere: "bg-emerald-100 text-emerald-700",
  rembourse: "bg-amber-100 text-amber-700",
};

export function SequestreBadge({ statut }: { statut: SequestreStatut }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[statut],
      )}
    >
      {SEQUESTRE_LABELS[statut]}
    </span>
  );
}
