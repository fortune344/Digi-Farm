import type { Metadata } from "next";
import { BuyerDashboard } from "@/components/dashboard/buyer-dashboard";
import { SellerDashboard } from "@/components/dashboard/seller-dashboard";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Tableau de bord — Digi-Farm",
};

export default async function TableauDeBordPage() {
  const { id, email, profile } = await requireUser();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-14">
        {profile.role === "agriculteur" ? (
          <SellerDashboard userId={id} nom={profile.nom} />
        ) : (
          <BuyerDashboard
            nom={profile.nom}
            email={email}
            region={profile.region}
          />
        )}
      </main>
    </>
  );
}
