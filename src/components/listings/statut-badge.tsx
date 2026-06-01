import { LISTING_STATUT_LABELS, type ListingStatut } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STYLES: Record<ListingStatut, string> = {
  active: "bg-primary/10 text-primary",
  epuisee: "bg-amber-100 text-amber-700",
  suspendue: "bg-muted text-muted-foreground",
};

export function StatutBadge({ statut }: { statut: ListingStatut }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[statut],
      )}
    >
      {LISTING_STATUT_LABELS[statut]}
    </span>
  );
}
