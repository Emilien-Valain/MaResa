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
  return (
    <form action={action} className="space-y-4 bg-white p-6 rounded-xl border border-gray-200">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom <span className="text-red-500">*</span>
        </label>
        <input
          name="nom"
          type="text"
          required
          defaultValue={defaultValues?.name ?? ""}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={defaultValues?.description ?? ""}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prix / nuit (€) <span className="text-red-500">*</span>
          </label>
          <input
            name="prix"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaultValues?.pricePerNight ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Capacité (pers.) <span className="text-red-500">*</span>
          </label>
          <input
            name="capacite"
            type="number"
            min="1"
            required
            defaultValue={defaultValues?.capacity ?? 2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
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
            className="rounded border-gray-300"
          />
          <label htmlFor="actif" className="text-sm text-gray-700">
            Chambre active (visible sur le site)
          </label>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Enregistrer
        </button>
        <Link
          href="/admin/chambres"
          className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
