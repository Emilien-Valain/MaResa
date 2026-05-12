import Link from "next/link";
import { AdminInput, AdminTextarea, Field } from "@/components/admin/ui";

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
  action: (formData: FormData) => Promise<void>;
  defaultValues?: DefaultValues;
}) {
  return (
    <form
      action={action}
      style={{
        background: "var(--admin-surface)",
        border: "1px solid var(--admin-border)",
        borderRadius: "var(--admin-radius)",
        padding: 24,
      }}
    >
      <Field label="Nom *">
        <AdminInput
          name="nom"
          type="text"
          required
          defaultValue={defaultValues?.name ?? ""}
        />
      </Field>

      <Field label="Description">
        <AdminTextarea
          name="description"
          rows={3}
          defaultValue={defaultValues?.description ?? ""}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Prix / nuit (€) *">
          <AdminInput
            name="prix"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaultValues?.pricePerNight ?? ""}
          />
        </Field>

        <Field label="Capacité (pers.) *">
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
          style={{
            padding: "9px 18px",
            background: "var(--admin-primary)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Enregistrer
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
          Annuler
        </Link>
      </div>
    </form>
  );
}
