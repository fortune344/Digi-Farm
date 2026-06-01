"use client";

import { Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { deleteListingAction } from "@/app/annonces/actions";
import { Button } from "@/components/ui/button";

export function DeleteListingButton({ id }: { id: string }) {
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("Supprimer définitivement cette annonce ?")) {
      event.preventDefault();
    }
  }

  return (
    <form action={deleteListingAction} onSubmit={confirmDelete}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
        Supprimer
      </Button>
    </form>
  );
}
