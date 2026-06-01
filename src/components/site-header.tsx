import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              {user.profile.role === "agriculteur" && (
                <Link
                  href="/tableau-de-bord"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                  )}
                >
                  Mes annonces
                </Link>
              )}
              <Link
                href="/profil"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Mon profil
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
