import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getRoomsByTenant } from "@/lib/queries/rooms";
import { getActiveBookingsForCalendar } from "@/lib/queries/bookings";
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
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-semibold text-warm-950 capitalize">
          {formatMonthLabel(year, month)}
        </h1>
        <div className="flex items-center gap-2">
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

      {activeChambres.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-sm border border-warm-300 shadow-sm">
          <p className="text-warm-500 text-sm">Aucune chambre active.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-sm border border-warm-300 shadow-sm">
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
      )}

      {/* Légende */}
      <div className="flex gap-4 text-xs text-warm-600 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-300 inline-block" /> En attente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-300 inline-block" /> Confirmée
        </span>
      </div>
    </div>
  );
}
