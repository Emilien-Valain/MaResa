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
        <h1 className="text-2xl font-semibold text-gray-900 capitalize">
          {formatMonthLabel(year, month)}
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/calendrier?year=${prev.year}&month=${prev.month}`}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            ←
          </Link>
          <Link
            href={`/admin/calendrier?year=${now.getFullYear()}&month=${now.getMonth()}`}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Aujourd&apos;hui
          </Link>
          <Link
            href={`/admin/calendrier?year=${next.year}&month=${next.month}`}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            →
          </Link>
        </div>
      </div>

      {activeChambres.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-sm">Aucune chambre active.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-gray-500 font-medium w-32 sticky left-0 bg-white">
                  Chambre
                </th>
                {calendar.days.map((day) => {
                  const isToday =
                    day.toDateString() === new Date().toDateString();
                  return (
                    <th
                      key={day.getTime()}
                      className={`text-center py-2 px-1 font-medium min-w-[28px] ${
                        isToday ? "text-blue-600" : "text-gray-500"
                      }`}
                    >
                      {day.getDate()}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeChambres.map((chambre) => {
                const roomBookings = bookings.filter(
                  (b) => b.roomId === chambre.id,
                );

                return (
                  <tr key={chambre.id}>
                    <td className="py-2 pr-4 text-gray-700 font-medium sticky left-0 bg-white">
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
                              className={`block w-full h-6 rounded ${STATUS_COLORS[booking.status]}`}
                            />
                          ) : (
                            <div className="block w-full h-6 rounded bg-gray-50" />
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
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-yellow-100 inline-block" /> En attente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-100 inline-block" /> Confirmée
        </span>
      </div>
    </div>
  );
}
