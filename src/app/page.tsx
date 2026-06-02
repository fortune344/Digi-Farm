import {
  ArrowRight,
  Leaf,
  PackageCheck,
  Search,
  ShieldCheck,
  Sprout,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/listings/product-card";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/dal";
import { getPublicListings } from "@/lib/listings/public-queries";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Search,
    title: "Parcourez le marché",
    text: "Des produits frais des 5 régions du Togo, filtrés par catégorie et région.",
  },
  {
    icon: ShieldCheck,
    title: "Commandez en sécurité",
    text: "Payez en ligne : votre argent est séquestré jusqu'à la réception de la commande.",
  },
  {
    icon: PackageCheck,
    title: "Recevez & confirmez",
    text: "Retrait sur place ou livraison. Le vendeur n'est payé qu'après votre confirmation.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  const { items } = getPublicListings({ sort: "recent", page: 1 });
  const featured = items.slice(0, 8);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 -top-32 size-[28rem] rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute -right-20 top-10 size-[26rem] rounded-full bg-accent opacity-70 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-5xl px-4 py-24 text-center sm:py-32">
            <span className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border bg-card/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground shadow-sm backdrop-blur">
              <Sprout className="size-3.5 text-primary" />
              Producteurs togolais
            </span>

            <h1 className="animate-fade-up delay-1 mx-auto mt-6 max-w-4xl text-balance font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
              Le marché agricole du Togo,{" "}
              <span className="italic text-primary">en direct</span>
            </h1>

            <p className="animate-fade-up delay-2 mx-auto mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
              Achetez des produits frais directement aux agriculteurs. Paiement
              sécurisé par séquestre, retrait ou livraison.
            </p>

            <div className="animate-fade-up delay-3 mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/marche"
                className={cn(buttonVariants({ size: "lg" }), "group")}
              >
                Explorer le marché
                <ArrowRight className="size-4 transition-transform duration-200 ease-soft group-hover:translate-x-1" />
              </Link>
              <Link
                href={user ? "/tableau-de-bord" : "/inscription"}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                )}
              >
                {user ? "Mon tableau de bord" : "Devenir vendeur"}
              </Link>
            </div>

            <div className="animate-fade-up delay-3 mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> Paiement
                séquestré
              </span>
              <span className="inline-flex items-center gap-2">
                <Leaf className="size-4 text-primary" /> Producteurs vérifiés
              </span>
              <span className="inline-flex items-center gap-2">
                <Truck className="size-4 text-primary" /> Retrait ou livraison
              </span>
            </div>
          </div>
        </section>

        {/* COMMENT ÇA MARCHE */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Comment ça marche
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Simple, sûr, local
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <div
                key={title}
                className="rounded-3xl border bg-card p-7 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-display text-2xl font-semibold text-muted-foreground/40">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* PRODUITS EN VEDETTE */}
        {featured.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-10">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Fraîchement récolté
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  Produits en vedette
                </h2>
              </div>
              <Link
                href="/marche"
                className="group hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
              >
                Voir tout
                <ArrowRight className="size-4 transition-transform duration-200 ease-soft group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {featured.map((item) => (
                <ProductCard key={item.listing.id} {...item} />
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link
                href="/marche"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Voir tout le marché
              </Link>
            </div>
          </section>
        )}

        {/* CTA AGRICULTEURS — uniquement pour les visiteurs non connectés */}
        {!user && (
          <section className="mx-auto max-w-6xl px-4 py-20">
            <div className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)]"
              />
              <div className="relative mx-auto max-w-2xl">
                <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  Vous êtes agriculteur ?
                </h2>
                <p className="mt-3 text-primary-foreground/85">
                  Publiez vos produits gratuitement et vendez en direct à des
                  acheteurs partout au Togo.
                </p>
                <Link
                  href="/inscription"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "mt-7 bg-card text-foreground hover:bg-card/90",
                  )}
                >
                  Créer mon compte vendeur
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Digi-Farm — La marketplace agricole du
            Togo.
          </p>
          <p>Paiement sécurisé · Retrait ou livraison</p>
        </div>
      </footer>
    </>
  );
}
