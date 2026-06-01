"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState, useId } from "react";
import { updateProfileAction } from "@/app/profil/actions";
import { FieldError, FormAlert } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionState } from "@/lib/action-state";
import { REGIONS, type Region } from "@/lib/constants";

type Props = {
  nom: string;
  region: Region;
  telephone: string | null;
};

export function ProfileForm({ nom, region, telephone }: Props) {
  const [state, action] = useActionState(
    updateProfileAction,
    initialActionState,
  );
  const ids = { nom: useId(), region: useId(), telephone: useId() };
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="space-y-4">
      <FormAlert message={state.error} />
      {state.success && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-accent px-3 py-2 text-sm text-accent-foreground">
          <CheckCircle2 className="size-4 shrink-0 text-primary" />
          <span>{state.success}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={ids.nom}>Nom complet</Label>
        <Input
          id={ids.nom}
          name="nom"
          autoComplete="name"
          defaultValue={nom}
          aria-invalid={Boolean(errors.nom)}
        />
        <FieldError message={errors.nom} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.region}>Région</Label>
        <Select
          id={ids.region}
          name="region"
          defaultValue={region}
          aria-invalid={Boolean(errors.region)}
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
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
          defaultValue={telephone ?? ""}
          aria-invalid={Boolean(errors.telephone)}
          placeholder="+228 ..."
        />
        <FieldError message={errors.telephone} />
      </div>

      <SubmitButton>Enregistrer les modifications</SubmitButton>
    </form>
  );
}
