import { Leaf, ShieldCheck, Truck } from "lucide-react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { getCurrentUser } from "@/lib/auth/dal";

const SELLING_POINTS = [
  {
    icon: Leaf,
    title: "Du champ à l'assiette",
    text: "Achetez en direct aux agriculteurs du Togo, sans intermédiaire.",
  },
  {
    icon: ShieldCheck,
    title: "Paiement sécurisé",
    text: "Votre argent est séquestré jusqu'à la réception de la commande.",
  },
  {
    icon: Truck,
    title: "Retrait ou livraison",
    text: "Choisissez le retrait sur place ou un transporteur partenaire.",
  },
];

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Un utilisateur déjà connecté n'a rien à faire sur inscription/connexion.
  const user = await getCurrentUser();
  if (user) redirect("/profil");

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)]"
        />
        <Logo
          href="/"
          className="relative text-primary-foreground [&_span:first-child]:bg-primary-foreground [&_span:first-child]:text-primary"
        />
        <div className="relative space-y-8">
          <h2 className="max-w-sm text-3xl font-bold leading-tight">
            La marketplace agricole du Togo.
          </h2>
          <ul className="space-y-5">
            {SELLING_POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-primary-foreground/80">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} Digi-Farm
        </p>
      </aside>

      <main className="flex flex-col items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo href="/" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
