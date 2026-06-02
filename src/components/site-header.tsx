import { Store } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/marche"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            <Store className="size-4" />
            <span className="hidden sm:inline">Marché</span>
          </Link>

          {user ? (
            <>
              <Link
                href="/tableau-de-bord"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Tableau de bord
              </Link>
              <Link
                href="/profil"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "hidden sm:inline-flex",
                )}
              >
                Profil
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/connexion"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Connexion
              </Link>
              <Link
                href="/inscription"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
