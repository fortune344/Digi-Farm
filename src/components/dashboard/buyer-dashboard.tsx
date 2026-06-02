import {
  ArrowRight,
  Mail,
  MapPin,
  Package,
  ShoppingBasket,
} from "lucide-react";
import Link from "next/link";
import { SequestreBadge } from "@/components/orders/sequestre-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ORDER_STATUT_LABELS } from "@/lib/constants";
import { formatFCFA } from "@/lib/format";
import { getOrdersByBuyer } from "@/lib/orders/queries";
import { cn } from "@/lib/utils";

export function BuyerDashboard({
  userId,
  nom,
  email,
  region,
}: {
  userId: string;
  nom: string;
  email: string;
  region: string;
}) {
  const orders = getOrdersByBuyer(userId);

  return (
    <>
      <div className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Espace acheteur
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Bonjour {nom.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          Suivez vos commandes et parcourez le marché.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4 text-primary" />
              Mes commandes
            </CardTitle>
            <CardDescription>
              {orders.length} commande{orders.length > 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/30 py-12 text-center">
                <ShoppingBasket className="size-9 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Vous n'avez pas encore de commande.
                </p>
                <Link
                  href="/marche"
                  className={cn(buttonVariants({ size: "sm" }), "group")}
                >
                  Parcourir le marché
                  <ArrowRight className="size-4 transition-transform duration-200 ease-soft group-hover:translate-x-1" />
                </Link>
              </div>
            ) : (
              <ul className="divide-y">
                {orders.map(({ order, payment, item }) => (
                  <li key={order.id}>
                    <Link
                      href={`/commande/${order.id}`}
                      className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-primary"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {item?.titre ?? "Commande"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ORDER_STATUT_LABELS[order.statut]}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <SequestreBadge statut={payment.statutSequestre} />
                        <span className="font-semibold">
                          {formatFCFA(order.total)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Mon compte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-medium">{nom}</p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-4" />
              {email}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4" />
              Région {region}
            </p>
            <Link
              href="/profil"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "mt-2 w-full",
              )}
            >
              Modifier mon profil
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
