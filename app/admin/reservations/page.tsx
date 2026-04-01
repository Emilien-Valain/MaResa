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
        <h1 className="font-heading text-3xl font-semibold text-warm-900">Réservations</h1>
        <Link
          href="/admin/reservations/new"
          className="bg-warm-900 text-warm-50 px-4 py-2 rounded-sm text-sm font-medium hover:bg-warm-800 transition-colors"
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
              className={`px-3 py-1 rounded-sm text-xs border transition-colors ${
                params.roomId === c.id
                  ? "bg-warm-900 text-warm-50 border-warm-900"
                  : "border-warm-300 text-warm-600 hover:border-warm-900"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {/* Liste */}
      {reservations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-sm border border-warm-200">
          <p className="text-warm-400 text-sm">Aucune réservation.</p>
        </div>
      ) : (
        <div className="bg-white rounded-sm border border-warm-200 divide-y divide-warm-100">
          {reservations.map((r) => (
            <Link
              key={r.id}
              href={`/admin/reservations/${r.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-warm-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-warm-900">{r.guestName}</p>
                <p className="text-xs text-warm-400 mt-0.5">
                  {r.room?.name} ·{" "}
                  {new Date(r.checkIn).toLocaleDateString("fr-FR")} →{" "}
                  {new Date(r.checkOut).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-warm-700">
                  {r.totalPrice} €
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-sm ${STATUS_COLORS[r.status]}`}>
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
      className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
        active
          ? "bg-warm-900 text-warm-50"
          : "bg-warm-100 text-warm-600 hover:bg-warm-200"
      }`}
    >
      {label}
    </Link>
  );
}
