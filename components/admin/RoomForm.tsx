"use client";

import Link from "next/link";
import { AdminInput, AdminTextarea, Field, StatusBanner } from "@/components/admin/ui";
import { useFormAction } from "@/components/admin/useFormAction";
import type { FormResult } from "@/lib/validation";

type DefaultValues = {
  name?: string;
  description?: string | null;
  pricePerNight?: string;
  capacity?: number;
  active?: boolean;
};

export default function RoomForm({
  action,
  defaultValues,
}: {
  action: (formData: FormData) => Promise<FormResult>;
  defaultValues?: DefaultValues;
}) {
  const form = useFormAction(action);
  return (
    <form
      onSubmit={form.onSubmit}
      style={{
        background: "var(--admin-surface)",
        border: "1px solid var(--admin-border)",
        borderRadius: "var(--admin-radius)",
        padding: 24,
      }}
    >
      {form.error && <StatusBanner variant="error">{form.error}</StatusBanner>}
      <Field label="Nom *" error={form.fieldError("nom")}>
        <AdminInput
          name="nom"
          type="text"
          required
          defaultValue={defaultValues?.name ?? ""}
        />
      </Field>

      <Field label="Description" error={form.fieldError("description")}>
        <AdminTextarea
          name="description"
          rows={3}
          defaultValue={defaultValues?.description ?? ""}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Prix / nuit (€) *" error={form.fieldError("prix")}>
          <AdminInput
            name="prix"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaultValues?.pricePerNight ? String(Number(defaultValues.pricePerNight)) : ""}
          />
        </Field>

        <Field label="Capacité (pers.) *" error={form.fieldError("capacite")}>
          <AdminInput
            name="capacite"
            type="number"
            min="1"
            required
            defaultValue={defaultValues?.capacity ?? 2}
          />
        </Field>
      </div>

      {defaultValues !== undefined && (
        <label className="flex items-center gap-2 mb-4">
          <input
            name="actif"
            id="actif"
            type="checkbox"
            defaultChecked={defaultValues.active ?? true}
            style={{ accentColor: "var(--admin-primary)" }}
          />
          <span
            className="text-[13px]"
            style={{ color: "var(--admin-text)" }}
          >
            Chambre active (visible sur le site)
          </span>
        </label>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={form.pending}
          style={{
            padding: "9px 18px",
            background: "var(--admin-primary)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: form.pending ? "wait" : "pointer",
            opacity: form.pending ? 0.7 : 1,
          }}
        >
          {form.pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <Link
          href="/admin/chambres"
          style={{
            padding: "9px 18px",
            color: "var(--admin-text-muted)",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Retour
        </Link>
      </div>
    </form>
  );
}
