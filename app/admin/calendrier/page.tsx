import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getRoomsByTenant } from "@/lib/queries/rooms";
import { getActiveBookingsForCalendar } from "@/lib/queries/bookings";
import IcalSyncButton from "@/components/admin/IcalSyncButton";
import {
  getCalendarMonth,
  prevMonth,
  nextMonth,
  isDateInBooking,
  formatMonthLabel,
  STATUS_COLORS,
} from "@/lib/calendar";

export default async function CalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { tenantId } = await requireSession();
  const params = await searchParams;

  const now = new Date();
  const yearParsed = parseInt(params.year ?? "");
  const monthParsed = parseInt(params.month ?? "");
  const year = Number.isFinite(yearParsed) ? yearParsed : now.getFullYear();
  const month = Number.isFinite(monthParsed) && monthParsed >= 0 && monthParsed <= 11
    ? monthParsed
    : now.getMonth();

  const calendar = getCalendarMonth(year, month);
  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);

  const [chambres, bookings] = await Promise.all([
    getRoomsByTenant(tenantId),
    getActiveBookingsForCalendar(tenantId, calendar.firstDay, calendar.lastDay),
  ]);

  const activeChambres = chambres.filter((c) => c.active);

  return (
    <div className="space-y-6">
      {/* Navigation mois */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-warm-950 capitalize">
          {formatMonthLabel(year, month)}
        </h1>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <IcalSyncButton />
          <div className="flex items-center gap-1.5">
            <Link
              href={`/admin/calendrier?year=${prev.year}&month=${prev.month}`}
              className="px-3 py-1.5 rounded-sm text-sm bg-warm-200 text-warm-700 hover:bg-warm-300 transition-colors font-medium"
            >
              ←
            </Link>
            <Link
              href={`/admin/calendrier?year=${now.getFullYear()}&month=${now.getMonth()}`}
              className="px-3 py-1.5 rounded-sm text-sm bg-warm-200 text-warm-700 hover:bg-warm-300 transition-colors font-medium"
            >
              Aujourd&apos;hui
            </Link>
            <Link
              href={`/admin/calendrier?year=${next.year}&month=${next.month}`}
              className="px-3 py-1.5 rounded-sm text-sm bg-warm-200 text-warm-700 hover:bg-warm-300 transition-colors font-medium"
            >
              →
            </Link>
          </div>
        </div>
      </div>

      {activeChambres.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-sm border border-warm-300 shadow-sm">
          <p className="text-warm-500 text-sm">Aucune chambre active.</p>
        </div>
      ) : (
        <>
          {/* ── Vue mobile : liste par chambre ─────────────────────────── */}
          <div className="md:hidden space-y-4">
            {activeChambres.map((chambre) => {
              const roomBookings = bookings.filter(
                (b) => b.roomId === chambre.id,
              );
              // Dédupliquer les réservations (une résa peut couvrir plusieurs jours)
              const uniqueBookings = roomBookings.filter(
                (b, i, arr) => arr.findIndex((x) => x.id === b.id) === i,
              );

              return (
                <div
                  key={chambre.id}
                  className="bg-white rounded-sm border border-warm-300 shadow-sm"
                >
                  <div className="px-4 py-3 border-b border-warm-200">
                    <h2 className="text-sm font-semibold text-warm-900">
                      {chambre.name}
                    </h2>
                  </div>
                  {uniqueBookings.length === 0 ? (
                    <p className="px-4 py-4 text-xs text-warm-400">
                      Aucune réservation ce mois
                    </p>
                  ) : (
                    <div className="divide-y divide-warm-100">
                      {uniqueBookings.map((b) => (
                        <Link
                          key={b.id}
                          href={`/admin/reservations/${b.id}`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-warm-50 transition-colors"
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                              b.status === "confirmed"
                                ? "bg-green-400"
                                : "bg-yellow-400"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-warm-900 truncate">
                              {b.guestName}
                            </p>
                            <p className="text-xs text-warm-500">
                              {new Date(b.checkIn).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                              })}
                              {" → "}
                              {new Date(b.checkOut).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                          </div>
                          <span className="text-xs text-warm-400">→</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Vue desktop : tableau grille ────────────────────────────── */}
          <div className="hidden md:block overflow-x-auto bg-white rounded-sm border border-warm-300 shadow-sm">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-warm-200">
                  <th className="text-left py-3 px-4 text-warm-600 font-semibold w-32 sticky left-0 bg-white">
                    Chambre
                  </th>
                  {calendar.days.map((day) => {
                    const isToday =
                      day.toDateString() === new Date().toDateString();
                    return (
                      <th
                        key={day.getTime()}
                        className={`text-center py-3 px-1 font-semibold min-w-[28px] ${
                          isToday ? "text-amber-accent" : "text-warm-600"
                        }`}
                      >
                        {day.getDate()}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {activeChambres.map((chambre) => {
                  const roomBookings = bookings.filter(
                    (b) => b.roomId === chambre.id,
                  );

                  return (
                    <tr key={chambre.id}>
                      <td className="py-2 px-4 text-warm-800 font-medium sticky left-0 bg-white">
                        {chambre.name}
                      </td>
                      {calendar.days.map((day) => {
                        const booking = roomBookings.find((b) =>
                          isDateInBooking(
                            day,
                            new Date(b.checkIn),
                            new Date(b.checkOut),
                          ),
                        );

                        return (
                          <td key={day.getTime()} className="p-0.5 text-center">
                            {booking ? (
                              <Link
                                href={`/admin/reservations/${booking.id}`}
                                title={booking.guestName}
                                className={`block w-full h-6 rounded-sm ${STATUS_COLORS[booking.status]}`}
                              />
                            ) : (
                              <div className="block w-full h-6 rounded-sm bg-warm-50" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Légende */}
      <div className="flex flex-wrap gap-4 text-xs text-warm-600 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-300 inline-block" /> En attente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> Confirmée
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-sky-300 inline-block" /> Terminée
        </span>
      </div>
    </div>
  );
}
