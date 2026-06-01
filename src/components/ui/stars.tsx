import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const rounded = Math.round(value);
  return (
    <div
      role="img"
      className={cn("flex items-center gap-0.5", className)}
      aria-label={`Note ${value.toFixed(1)} sur 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i <= rounded
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}
