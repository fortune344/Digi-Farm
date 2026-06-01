import { BadgeCheck, Mail, MapPin, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile/profile-form";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { ROLE_LABELS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Mon profil — Digi-Farm",
};

export default async function ProfilPage() {
  const { email, profile } = await requireUser();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{profile.nom}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                {ROLE_LABELS[profile.role]}
              </span>
              {profile.verifie ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <BadgeCheck className="size-3.5" />
                  Vérifié
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  <ShieldAlert className="size-3.5" />
                  Non vérifié
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4" />
                {email}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4" />
                Région {profile.region}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Modifier mes informations
              </CardTitle>
              <CardDescription>
                Votre rôle et votre e-mail ne sont pas modifiables ici.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
                nom={profile.nom}
                region={profile.region}
                telephone={profile.telephone}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
