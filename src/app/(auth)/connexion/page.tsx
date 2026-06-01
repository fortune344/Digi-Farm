import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Connexion — Digi-Farm",
};

export default function ConnexionPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Bon retour 👋</h1>
        <p className="text-muted-foreground">
          Connectez-vous pour accéder à votre espace.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
