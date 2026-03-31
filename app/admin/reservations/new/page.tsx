import { requireSession } from "@/lib/session";
import { getRoomsByTenant } from "@/lib/queries/rooms";
import { createBookingManual } from "@/lib/actions/bookings";
import Link from "next/link";

export default async function NewReservationPage() {
  const { tenantId } = await requireSession();
  const chambres = await getRoomsByTenant(tenantId);

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/reservations" className="text-sm text-gray-400 hover:text-gray-900">
          ← Réservations
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900">Nouvelle réservation</h1>

      <form action={createBookingManual} className="space-y-4 bg-white p-6 rounded-xl border border-gray-200">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chambre <span className="text-red-500">*</span></label>
          <select name="roomId" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="">Sélectionner…</option>
            {chambres.filter((c) => c.active).map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.pricePerNight} €/nuit</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arrivée <span className="text-red-500">*</span></label>
            <input name="checkIn" type="date" required defaultValue={today} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Départ <span className="text-red-500">*</span></label>
            <input name="checkOut" type="date" required defaultValue={tomorrow} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom client <span className="text-red-500">*</span></label>
            <input name="guestName" type="text" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Voyageurs <span className="text-red-500">*</span></label>
            <input name="guestCount" type="number" min="1" required defaultValue={1} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email client <span className="text-red-500">*</span></label>
          <input name="guestEmail" type="email" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
          <input name="guestPhone" type="tel" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes internes</label>
          <textarea name="notes" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
            Enregistrer
          </button>
          <Link href="/admin/reservations" className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
