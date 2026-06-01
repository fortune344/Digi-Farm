import type * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "default" | "sm" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const VARIANTS: Record<Variant, string> = {
  default:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.99]",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline:
    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
};

const SIZES: Record<Size, string> = {
  default: "h-11 px-5 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-12 rounded-md px-8 text-base",
  icon: "h-10 w-10",
};

export function buttonVariants({
  variant = "default",
  size = "default",
}: {
  variant?: Variant;
  size?: Size;
} = {}) {
  return cn(base, VARIANTS[variant], SIZES[size]);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
