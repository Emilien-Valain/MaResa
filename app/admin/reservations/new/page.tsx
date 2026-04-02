import { requireSession } from "@/lib/session";
import { getRoomsByTenant } from "@/lib/queries/rooms";
import { createBookingManual } from "@/lib/actions/bookings";
import Link from "next/link";

export default async function NewReservationPage() {
  const { tenantId } = await requireSession();
  const chambres = await getRoomsByTenant(tenantId);

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const inputClass =
    "w-full border border-warm-300 rounded-sm px-3 py-2.5 text-sm text-warm-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-accent/40 focus:border-amber-accent transition-colors";

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/reservations" className="text-sm text-warm-500 hover:text-warm-900 font-medium transition-colors">
          ← Réservations
        </Link>
      </div>

      <h1 className="font-heading text-3xl font-semibold text-warm-950">Nouvelle réservation</h1>

      <form action={createBookingManual} className="space-y-4 bg-white p-6 rounded-sm border border-warm-300 shadow-sm">

        <div>
          <label className="block text-sm font-medium text-warm-800 mb-1.5">Chambre <span className="text-red-500">*</span></label>
          <select name="roomId" required className={inputClass}>
            <option value="">Sélectionner…</option>
            {chambres.filter((c) => c.active).map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.pricePerNight} €/nuit</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-warm-800 mb-1.5">Arrivée <span className="text-red-500">*</span></label>
            <input name="checkIn" type="date" required defaultValue={today} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-warm-800 mb-1.5">Départ <span className="text-red-500">*</span></label>
            <input name="checkOut" type="date" required defaultValue={tomorrow} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-warm-800 mb-1.5">Nom client <span className="text-red-500">*</span></label>
            <input name="guestName" type="text" required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-warm-800 mb-1.5">Voyageurs <span className="text-red-500">*</span></label>
            <input name="guestCount" type="number" min="1" required defaultValue={1} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-warm-800 mb-1.5">Email client <span className="text-red-500">*</span></label>
          <input name="guestEmail" type="email" required className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-warm-800 mb-1.5">Téléphone</label>
          <input name="guestPhone" type="tel" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-warm-800 mb-1.5">Notes internes</label>
          <textarea name="notes" rows={2} className={inputClass} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="bg-warm-900 text-white px-4 py-2.5 rounded-sm text-sm font-medium hover:bg-warm-800 transition-colors">
            Enregistrer
          </button>
          <Link href="/admin/reservations" className="px-4 py-2.5 rounded-sm text-sm text-warm-600 hover:text-warm-900 transition-colors">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
