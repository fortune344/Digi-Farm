import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/profil/actions";
import { Button } from "@/components/ui/button";

// Bouton de déconnexion : appelle l'action serveur via un <form>.
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" size="sm">
        <LogOut className="size-4" />
        Se déconnecter
      </Button>
    </form>
  );
}
