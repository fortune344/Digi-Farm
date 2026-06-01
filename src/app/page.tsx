import { ArrowRight, Leaf, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Leaf,
    title: "Produits locaux",
    text: "Maïs, tomates, ignames, soja… en direct des producteurs togolais.",
  },
  {
    icon: ShieldCheck,
    title: "Paiement séquestré",
    text: "L'argent n'est versé au vendeur qu'une fois la commande reçue.",
  },
  {
    icon: Truck,
    title: "Retrait ou livraison",
    text: "Retrait sur place ou transporteur partenaire, au choix.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
              🌱 Marketplace agricole du Togo
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
              Vendez et achetez vos produits agricoles en toute confiance
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Digi-Farm relie directement les agriculteurs et les acheteurs,
              avec un paiement sécurisé et une livraison organisée.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={user ? "/profil" : "/inscription"}
                className={cn(buttonVariants({ size: "lg" }))}
              >
                {user ? "Accéder à mon espace" : "Commencer gratuitement"}
                <ArrowRight className="size-4" />
              </Link>
              {!user && (
                <Link
                  href="/connexion"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                  )}
                >
                  J'ai déjà un compte
                </Link>
              )}
            </div>
          </div>

          <div className="mt-20 grid gap-6 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-xl border bg-card p-6 shadow-sm"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Digi-Farm — La marketplace agricole du
          Togo.
        </div>
      </footer>
    </>
  );
}
