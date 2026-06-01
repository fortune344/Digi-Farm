"use client";

import { ImagePlus } from "lucide-react";
import { type ChangeEvent, useId, useState } from "react";
import { MAX_PHOTOS } from "@/lib/constants";

type Props = {
  /** Nombre de photos déjà conservées (mode édition). */
  alreadyKept?: number;
};

export function PhotoPicker({ alreadyKept = 0 }: Props) {
  const inputId = useId();
  const [previews, setPreviews] = useState<string[]>([]);
  const remaining = Math.max(0, MAX_PHOTOS - alreadyKept);

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setPreviews(files.map((file) => URL.createObjectURL(file)));
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <ImagePlus className="size-6" />
        <span>
          <span className="font-medium text-foreground">
            Ajouter des photos
          </span>{" "}
          (JPEG, PNG, WebP — {remaining} max)
        </span>
        <input
          id={inputId}
          type="file"
          name="photos"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="sr-only"
          onChange={onChange}
        />
      </label>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {previews.map((src) => (
            // biome-ignore lint/performance/noImgElement: aperçu local via blob: (non optimisable par next/image)
            <img
              key={src}
              src={src}
              alt="Aperçu"
              className="aspect-square w-full rounded-md border object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}
