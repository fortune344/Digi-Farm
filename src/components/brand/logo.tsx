import { Sprout } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 font-semibold", className)}
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sprout className="size-5" />
      </span>
      <span className="text-lg tracking-tight">Digi-Farm</span>
    </Link>
  );
}
