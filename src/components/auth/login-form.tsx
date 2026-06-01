"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { loginAction } from "@/app/(auth)/actions";
import { FieldError, FormAlert } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionState } from "@/lib/action-state";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialActionState);
  const emailId = useId();
  const passwordId = useId();
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="space-y-4">
      <FormAlert message={state.error} />

      <div className="space-y-1.5">
        <Label htmlFor={emailId}>Adresse e-mail</Label>
        <Input
          id={emailId}
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
        <Label htmlFor={passwordId}>Mot de passe</Label>
        <Input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          placeholder="Votre mot de passe"
        />
        <FieldError message={errors.password} />
      </div>

      <SubmitButton className="w-full">Se connecter</SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link
          href="/inscription"
          className="font-medium text-primary hover:underline"
        >
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
