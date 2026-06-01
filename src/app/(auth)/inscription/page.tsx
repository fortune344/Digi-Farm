import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Inscription — Digi-Farm",
};

export default function InscriptionPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Créer un compte</h1>
        <p className="text-muted-foreground">
          Vendez ou achetez des produits agricoles en quelques minutes.
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
