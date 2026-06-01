"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useId } from "react";
import { FieldError, FormAlert } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { type ActionState, initialActionState } from "@/lib/action-state";
import {
  CATEGORIES,
  EDITABLE_STATUTS,
  LISTING_STATUT_LABELS,
  REGIONS,
  UNITES,
} from "@/lib/constants";
import { PhotoPicker } from "./photo-picker";

type ServerAction = (
  prev: ActionState,
  formData: FormData,
) => Promise<ActionState>;

type Props = {
  action: ServerAction;
  submitLabel: string;
  cancelHref: string;
  defaults?: Record<string, string>;
  existingPhotos?: string[];
  listingId?: string;
  showStatut?: boolean;
};

export function ListingForm({
  action,
  submitLabel,
  cancelHref,
  defaults = {},
  existingPhotos = [],
  listingId,
  showStatut = false,
}: Props) {
  const [state, formAction] = useActionState(action, initialActionState);
  const errors = state.fieldErrors ?? {};
  const ids = {
    titre: useId(),
    categorie: useId(),
    description: useId(),
    prix: useId(),
    unite: useId(),
    quantite: useId(),
    region: useId(),
    statut: useId(),
  };

  const value = (key: string) => state.values?.[key] ?? defaults[key] ?? "";

  return (
    <form action={formAction} noValidate className="space-y-5">
      {listingId && <input type="hidden" name="id" value={listingId} />}
      <FormAlert message={state.error} />

      <div className="space-y-1.5">
        <Label htmlFor={ids.titre}>Titre de l'annonce</Label>
        <Input
          id={ids.titre}
          name="titre"
          defaultValue={value("titre")}
          aria-invalid={Boolean(errors.titre)}
          placeholder="Ex. Tomates fraîches de saison"
        />
        <FieldError message={errors.titre} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={ids.categorie}>Catégorie</Label>
          <Select
            id={ids.categorie}
            name="categorie"
            defaultValue={value("categorie")}
            aria-invalid={Boolean(errors.categorie)}
          >
            <option value="" disabled>
              Choisir…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <FieldError message={errors.categorie} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={ids.region}>Région</Label>
          <Select
            id={ids.region}
            name="region"
            defaultValue={value("region")}
            aria-invalid={Boolean(errors.region)}
          >
            <option value="" disabled>
              Choisir…
            </option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <FieldError message={errors.region} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.description}>Description</Label>
        <Textarea
          id={ids.description}
          name="description"
          rows={4}
          defaultValue={value("description")}
          aria-invalid={Boolean(errors.description)}
          placeholder="Qualité, variété, conditionnement, disponibilité…"
        />
        <FieldError message={errors.description} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={ids.prix}>Prix (FCFA)</Label>
          <Input
            id={ids.prix}
            name="prix"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            defaultValue={value("prix")}
            aria-invalid={Boolean(errors.prix)}
            placeholder="Ex. 500"
          />
          <FieldError message={errors.prix} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={ids.unite}>Unité</Label>
          <Select
            id={ids.unite}
            name="unite"
            defaultValue={value("unite")}
            aria-invalid={Boolean(errors.unite)}
          >
            <option value="" disabled>
              Choisir…
            </option>
            {UNITES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
          <FieldError message={errors.unite} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={ids.quantite}>Quantité dispo.</Label>
          <Input
            id={ids.quantite}
            name="quantiteDispo"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            defaultValue={value("quantiteDispo")}
            aria-invalid={Boolean(errors.quantiteDispo)}
            placeholder="Ex. 100"
          />
          <FieldError message={errors.quantiteDispo} />
        </div>
      </div>

      {showStatut && (
        <div className="space-y-1.5">
          <Label htmlFor={ids.statut}>Statut</Label>
          <Select
            id={ids.statut}
            name="statut"
            defaultValue={value("statut") || "active"}
          >
            {EDITABLE_STATUTS.map((s) => (
              <option key={s} value={s}>
                {LISTING_STATUT_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
      )}

      {existingPhotos.length > 0 && (
        <div className="space-y-2">
          <Label>Photos actuelles</Label>
          <p className="text-xs text-muted-foreground">
            Cochez une photo pour la supprimer à l'enregistrement.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {existingPhotos.map((src) => (
              <label
                key={src}
                className="group relative cursor-pointer overflow-hidden rounded-md border"
              >
                <Image
                  src={src}
                  alt="Photo de l'annonce"
                  width={160}
                  height={160}
                  className="aspect-square w-full object-cover transition-opacity group-has-[:checked]:opacity-30"
                />
                <input
                  type="checkbox"
                  name="removePhotos"
                  value={src}
                  className="absolute right-1.5 top-1.5 size-4 accent-destructive"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>
          {existingPhotos.length > 0 ? "Ajouter des photos" : "Photos"}
        </Label>
        <PhotoPicker alreadyKept={existingPhotos.length} />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link
          href={cancelHref}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
