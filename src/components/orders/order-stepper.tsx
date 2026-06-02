import { Check } from "lucide-react";
import { Fragment } from "react";
import type { OrderStatut } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STEPS: { key: OrderStatut; label: string }[] = [
  { key: "payee", label: "Payée" },
  { key: "preparee", label: "Préparée" },
  { key: "expediee", label: "Expédiée" },
  { key: "livree", label: "Livrée" },
];
const INDEX: Record<string, number> = {
  payee: 0,
  preparee: 1,
  expediee: 2,
  livree: 3,
};

export function OrderStepper({ statut }: { statut: OrderStatut }) {
  const current = INDEX[statut] ?? -1;

  return (
    <ol className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <Fragment key={step.key}>
            <li className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-[11px]",
                  done
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </li>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-1 mb-5 h-0.5 flex-1 rounded-full",
                  i < current ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}
