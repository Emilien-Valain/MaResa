"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { FormResult } from "@/lib/validation";

const UNEXPECTED: NonNullable<FormResult> = {
  error: "L'enregistrement n'a pas abouti. Réessayez ; si cela persiste, contactez DirectLoc.",
  fieldErrors: {},
};

/**
 * Soumet un formulaire à une server action qui RENVOIE ses erreurs (FormResult).
 * Passe par onSubmit plutôt que `action=` : React réinitialise un formulaire après
 * une `action`, ce qui effacerait la saisie de l'hôte justement quand elle est refusée.
 */
export function useFormAction(
  action: (formData: FormData) => Promise<FormResult | void>,
  { prepare, onSuccess }: { prepare?: (fd: FormData) => void; onSuccess?: () => void } = {},
) {
  const [result, setResult] = useState<NonNullable<FormResult> | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    prepare?.(fd);
    setResult(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const res = await action(fd);
        if (res) {
          setResult(res);
        } else {
          setSaved(true);
          onSuccess?.();
        }
      } catch {
        setResult(UNEXPECTED);
      }
    });
  };

  /** Message à passer en `error` d'un <Field> : marque le champ refusé (aria-invalid). */
  const fieldError = (name: string) => result?.fieldErrors[name];

  return { onSubmit, pending, saved, error: result?.error ?? null, fieldError };
}
