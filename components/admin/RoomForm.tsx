import Link from "next/link";

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
  const inputClass =
    "w-full border border-warm-300 rounded-sm px-3 py-2.5 text-sm text-warm-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-accent/40 focus:border-amber-accent transition-colors";

  return (
    <form action={action} className="space-y-4 bg-white p-6 rounded-sm border border-warm-300 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-warm-800 mb-1.5">
          Nom <span className="text-red-500">*</span>
        </label>
        <input
          name="nom"
          type="text"
          required
          defaultValue={defaultValues?.name ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-warm-800 mb-1.5">
          Description
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={defaultValues?.description ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-warm-800 mb-1.5">
            Prix / nuit (€) <span className="text-red-500">*</span>
          </label>
          <input
            name="prix"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaultValues?.pricePerNight ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-warm-800 mb-1.5">
            Capacité (pers.) <span className="text-red-500">*</span>
          </label>
          <input
            name="capacite"
            type="number"
            min="1"
            required
            defaultValue={defaultValues?.capacity ?? 2}
            className={inputClass}
          />
        </div>
      </div>

      {defaultValues !== undefined && (
        <div className="flex items-center gap-2">
          <input
            name="actif"
            id="actif"
            type="checkbox"
            defaultChecked={defaultValues.active ?? true}
            className="rounded border-warm-400"
          />
          <label htmlFor="actif" className="text-sm text-warm-800">
            Chambre active (visible sur le site)
          </label>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="bg-warm-900 text-white px-4 py-2.5 rounded-sm text-sm font-medium hover:bg-warm-800 transition-colors"
        >
          Enregistrer
        </button>
        <Link
          href="/admin/chambres"
          className="px-4 py-2.5 rounded-sm text-sm text-warm-600 hover:text-warm-900 transition-colors"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
