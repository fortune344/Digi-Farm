"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { signupAction } from "@/app/(auth)/actions";
import { FieldError, FormAlert } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionState } from "@/lib/action-state";
import { REGIONS, ROLE_LABELS, SIGNUP_ROLES } from "@/lib/constants";

export function SignupForm() {
  const [state, action] = useActionState(signupAction, initialActionState);
  const ids = {
    nom: useId(),
    email: useId(),
    password: useId(),
    role: useId(),
    region: useId(),
    telephone: useId(),
  };
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="space-y-4">
      <FormAlert message={state.error} />

      <div className="space-y-1.5">
        <Label htmlFor={ids.nom}>Nom complet</Label>
        <Input
          id={ids.nom}
          name="nom"
          autoComplete="name"
          defaultValue={values.nom}
          aria-invalid={Boolean(errors.nom)}
          placeholder="Ex. Komla Adjo"
        />
        <FieldError message={errors.nom} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.email}>Adresse e-mail</Label>
        <Input
          id={ids.email}
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={values.email}
          aria-invalid={Boolean(errors.email)}
          placeholder="vous@exemple.com"
        />
        <FieldError message={errors.email} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.password}>Mot de passe</Label>
        <Input
          id={ids.password}
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          placeholder="Au moins 8 caractères"
        />
        <FieldError message={errors.password} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.role}>Je suis…</Label>
        <Select
          id={ids.role}
          name="role"
          defaultValue={values.role ?? ""}
          aria-invalid={Boolean(errors.role)}
        >
          <option value="" disabled>
            Choisissez votre rôle
          </option>
          {SIGNUP_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
        <FieldError message={errors.role} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.region}>Région</Label>
        <Select
          id={ids.region}
          name="region"
          defaultValue={values.region ?? ""}
          aria-invalid={Boolean(errors.region)}
        >
          <option value="" disabled>
            Choisissez votre région
          </option>
          {REGIONS.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </Select>
        <FieldError message={errors.region} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.telephone}>
          Téléphone <span className="text-muted-foreground">(facultatif)</span>
        </Label>
        <Input
          id={ids.telephone}
          name="telephone"
          type="tel"
          autoComplete="tel"
          defaultValue={values.telephone}
          aria-invalid={Boolean(errors.telephone)}
          placeholder="+228 ..."
        />
        <FieldError message={errors.telephone} />
      </div>

      <SubmitButton className="w-full">Créer mon compte</SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link
          href="/connexion"
          className="font-medium text-primary hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </form>
  );
}
