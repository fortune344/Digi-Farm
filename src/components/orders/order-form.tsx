"use client";

import { ShieldCheck } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { createOrderAction } from "@/app/commander/[id]/actions";
import { FieldError, FormAlert } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/lib/action-state";
import { MODE_LIVRAISON_LABELS, MODE_LIVRAISONS } from "@/lib/constants";
import { formatFCFA } from "@/lib/format";

type Props = {
  listingId: string;
  prix: number;
  unite: string;
  quantiteDispo: number;
};

export function OrderForm({ listingId, prix, unite, quantiteDispo }: Props) {
  const [state, action] = useActionState(createOrderAction, initialActionState);
  const ids = { quantite: useId(), mode: useId(), adresse: useId() };
  const errors = state.fieldErrors ?? {};

  const [quantite, setQuantite] = useState("1");
  const [mode, setMode] = useState<string>("retrait");

  const q = Number(quantite);
  const total = Number.isFinite(q) && q > 0 ? Math.round(prix * q) : 0;

  return (
    <form action={action} noValidate className="space-y-5">
      <input type="hidden" name="listingId" value={listingId} />
      <FormAlert message={state.error} />

      <div className="space-y-1.5">
        <Label htmlFor={ids.quantite}>Quantité ({unite})</Label>
        <Input
          id={ids.quantite}
          name="quantite"
          type="number"
          min={1}
          step="any"
          inputMode="decimal"
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
          aria-invalid={Boolean(errors.quantite)}
        />
        <p className="text-xs text-muted-foreground">
          Disponible : {quantiteDispo} {unite}
        </p>
        <FieldError message={errors.quantite} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.mode}>Mode de livraison</Label>
        <Select
          id={ids.mode}
          name="modeLivraison"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          {MODE_LIVRAISONS.map((m) => (
            <option key={m} value={m}>
              {MODE_LIVRAISON_LABELS[m]}
            </option>
          ))}
        </Select>
      </div>

      {mode === "transporteur" && (
        <div className="space-y-1.5">
          <Label htmlFor={ids.adresse}>Adresse de livraison</Label>
          <Textarea
            id={ids.adresse}
            name="adresse"
            rows={2}
            placeholder="Quartier, ville, point de repère, téléphone…"
            aria-invalid={Boolean(errors.adresse)}
          />
          <FieldError message={errors.adresse} />
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-4 py-3">
        <span className="text-sm text-muted-foreground">Total à payer</span>
        <span className="text-xl font-bold text-primary">
          {formatFCFA(total)}
        </span>
      </div>

      <SubmitButton className="w-full" size="lg">
        Procéder au paiement
      </SubmitButton>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-primary" />
        Paiement sécurisé : votre argent est séquestré jusqu'à réception.
      </p>
    </form>
  );
}
