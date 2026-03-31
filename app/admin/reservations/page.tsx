import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getBookingsByTenant } from "@/lib/queries/bookings";
import { getRoomsByTenant } from "@/lib/queries/rooms";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/calendar";
import type { BookingStatus, BookingFilters } from "@/lib/queries/bookings";

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; roomId?: string }>;
}) {
  const { tenantId } = await requireSession();
  const params = await searchParams;

  const filters: BookingFilters = {
    status: params.status as BookingStatus | undefined,
    roomId: params.roomId,
  };

  const [reservations, chambres] = await Promise.all([
    getBookingsByTenant(tenantId, filters),
    getRoomsByTenant(tenantId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Réservations</h1>
        <Link
          href="/admin/reservations/new"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Nouvelle réservation
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <FilterLink href="/admin/reservations" active={!params.status && !params.roomId} label="Toutes" />
        {(["pending", "confirmed", "completed", "cancelled"] as BookingStatus[]).map((s) => (
          <FilterLink
            key={s}
            href={`/admin/reservations?status=${s}`}
            active={params.status === s}
            label={STATUS_LABELS[s]}
          />
        ))}
        {params.roomId && (
          <FilterLink href="/admin/reservations" active={false} label="× Chambre" />
        )}
      </div>

      {/* Filtre chambre */}
      {chambres.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {chambres.map((c) => (
            <Link
              key={c.id}
              href={`/admin/reservations?roomId=${c.id}${params.status ? `&status=${params.status}` : ""}`}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                params.roomId === c.id
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-300 text-gray-600 hover:border-gray-900"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {/* Liste */}
      {reservations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-sm">Aucune réservation.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {reservations.map((r) => (
            <Link
              key={r.id}
              href={`/admin/reservations/${r.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{r.guestName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {r.room?.name} ·{" "}
                  {new Date(r.checkIn).toLocaleDateString("fr-FR")} →{" "}
                  {new Date(r.checkOut).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">
                  {r.totalPrice} €
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status]}`}>
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active
          ? "bg-gray-900 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label}
    </Link>
  );
}
