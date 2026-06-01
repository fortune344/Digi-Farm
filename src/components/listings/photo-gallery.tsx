"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function PhotoGallery({
  photos,
  alt,
}: {
  photos: string[];
  alt: string;
}) {
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border bg-muted text-muted-foreground">
        <ImageOff className="size-10" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
        <Image
          src={photos[active]}
          alt={alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      {photos.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {photos.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md border transition-opacity",
                index === active
                  ? "ring-2 ring-ring ring-offset-1"
                  : "opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={src}
                alt={`${alt} — photo ${index + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
