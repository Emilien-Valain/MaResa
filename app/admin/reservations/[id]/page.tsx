import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getBookingByIdAndTenant } from "@/lib/queries/bookings";
import { confirmBooking, cancelBooking, completeBooking } from "@/lib/actions/bookings";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/calendar";

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenantId } = await requireSession();
  const reservation = await getBookingByIdAndTenant(id, tenantId);
  if (!reservation) notFound();

  const nights = Math.ceil(
    (new Date(reservation.checkOut).getTime() - new Date(reservation.checkIn).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/reservations" className="text-sm text-gray-400 hover:text-gray-900">
          ← Réservations
        </Link>
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[reservation.status]}`}>
          {STATUS_LABELS[reservation.status]}
        </span>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900">{reservation.guestName}</h1>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <Section label="Séjour">
          <Row label="Chambre" value={reservation.room?.name ?? "—"} />
          <Row label="Arrivée" value={new Date(reservation.checkIn).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
          <Row label="Départ" value={new Date(reservation.checkOut).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
          <Row label="Durée" value={`${nights} nuit${nights > 1 ? "s" : ""}`} />
          <Row label="Voyageurs" value={`${reservation.guestCount} personne${reservation.guestCount > 1 ? "s" : ""}`} />
        </Section>

        <Section label="Client">
          <Row label="Nom" value={reservation.guestName} />
          <Row label="Email" value={reservation.guestEmail} />
          {reservation.guestPhone && <Row label="Téléphone" value={reservation.guestPhone} />}
        </Section>

        <Section label="Paiement">
          <Row label="Total" value={`${reservation.totalPrice} €`} />
          <Row label="Source" value={reservation.source === "manual" ? "Saisie manuelle" : "Site web"} />
        </Section>

        {reservation.notes && (
          <Section label="Notes">
            <p className="text-sm text-gray-700 px-5 pb-4">{reservation.notes}</p>
          </Section>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {reservation.status === "pending" && (
          <form action={confirmBooking.bind(null, id)}>
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
              Confirmer
            </button>
          </form>
        )}
        {reservation.status === "confirmed" && (
          <form action={completeBooking.bind(null, id)}>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Marquer terminée
            </button>
          </form>
        )}
        {(reservation.status === "pending" || reservation.status === "confirmed") && (
          <form action={cancelBooking.bind(null, id)}>
            <button type="submit" className="border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
              Annuler
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-5 mb-3">{label}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-5 py-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value}</span>
    </div>
  );
}
