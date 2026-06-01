import type * as React from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: primitive réutilisable ; htmlFor est fourni à chaque usage
    <label
      className={cn(
        "text-sm font-medium leading-none text-foreground",
        className,
      )}
      {...props}
    />
  );
}
