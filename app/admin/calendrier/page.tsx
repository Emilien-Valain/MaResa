import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getRoomsByTenant } from "@/lib/queries/rooms";
import { getActiveBookingsForCalendar } from "@/lib/queries/bookings";
import { getManualBlocksForCalendar } from "@/lib/queries/rules";
import IcalSyncButton from "@/components/admin/IcalSyncButton";
import {
  getCalendarMonth,
  prevMonth,
  nextMonth,
  isDateInBooking,
  formatMonthLabel,
  STATUS_COLORS,
} from "@/lib/calendar";
import { Card, GhostButton, PageHeader } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";

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
  const month =
    Number.isFinite(monthParsed) && monthParsed >= 0 && monthParsed <= 11
      ? monthParsed
      : now.getMonth();

  const calendar = getCalendarMonth(year, month);
  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);

  const [chambres, bookings, rawManualBlocks] = await Promise.all([
    getRoomsByTenant(tenantId),
    getActiveBookingsForCalendar(tenantId, calendar.firstDay, calendar.lastDay),
    getManualBlocksForCalendar(tenantId, calendar.firstDay, calendar.lastDay),
  ]);

  const blockedSet = new Set<string>();
  for (const block of rawManualBlocks) {
    const key = block.roomId ?? "__global__";
    if (block.recurring && block.recurrenceType === "weekly") {
      const days = (block.recurrenceDays as number[]) ?? [];
      const cur = new Date(
        Math.max(calendar.firstDay.getTime(), new Date(block.startDate).getTime()),
      );
      const end = block.recurrenceUntil
        ? new Date(
            Math.min(
              calendar.lastDay.getTime() + 86400000,
              new Date(block.recurrenceUntil).getTime(),
            ),
          )
        : new Date(calendar.lastDay.getTime() + 86400000);
      while (cur < end) {
        if (days.includes(cur.getDay())) {
          const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
          blockedSet.add(`${key}|${dateStr}`);
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      const start = new Date(block.startDate);
      const end = new Date(block.endDate);
      const cur = new Date(Math.max(start.getTime(), calendar.firstDay.getTime()));
      const rangeEnd = new Date(
        Math.min(end.getTime(), calendar.lastDay.getTime() + 86400000),
      );
      while (cur < rangeEnd) {
        const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
        blockedSet.add(`${key}|${dateStr}`);
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  function isDateBlocked(roomId: string, day: Date): boolean {
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    return (
      blockedSet.has(`${roomId}|${dateStr}`) ||
      blockedSet.has(`__global__|${dateStr}`)
    );
  }

  const activeChambres = chambres.filter((c) => c.active);

  return (
    <div className="space-y-5">
      <PageHeader
        title={<span className="capitalize">{formatMonthLabel(year, month)}</span>}
        subtitle={`${activeChambres.length} chambre${activeChambres.length > 1 ? "s" : ""} active${activeChambres.length > 1 ? "s" : ""}`}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <IcalSyncButton />
            <div className="flex items-center gap-1.5">
              <GhostButton
                href={`/admin/calendrier?year=${prev.year}&month=${prev.month}`}
                ariaLabel="Mois précédent"
              >
                <Icon.ChevronLeft size={14} />
              </GhostButton>
              <GhostButton
                href={`/admin/calendrier?year=${now.getFullYear()}&month=${now.getMonth()}`}
              >
                Aujourd&apos;hui
              </GhostButton>
              <GhostButton
                href={`/admin/calendrier?year=${next.year}&month=${next.month}`}
                ariaLabel="Mois suivant"
              >
                <Icon.ChevronRight size={14} />
              </GhostButton>
            </div>
          </div>
        }
      />

      {activeChambres.length === 0 ? (
        <Card style={{ padding: "60px 24px", textAlign: "center" }}>
          <p
            className="text-[14px]"
            style={{ color: "var(--admin-text-muted)" }}
          >
            Aucune chambre active.
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile : list per room */}
          <div className="md:hidden space-y-4">
            {activeChambres.map((chambre) => {
              const roomBookings = bookings.filter((b) => b.roomId === chambre.id);
              const uniqueBookings = roomBookings.filter(
                (b, i, arr) => arr.findIndex((x) => x.id === b.id) === i,
              );
              return (
                <Card key={chambre.id}>
                  <div
                    className="px-4 py-3"
                    style={{ borderBottom: "1px solid var(--admin-border-light)" }}
                  >
                    <h2
                      className="text-[14px] font-bold"
                      style={{ color: "var(--admin-text)" }}
                    >
                      {chambre.name}
                    </h2>
                  </div>
                  {uniqueBookings.length === 0 ? (
                    <p
                      className="px-4 py-4 text-[12px]"
                      style={{ color: "var(--admin-text-subtle)" }}
                    >
                      Aucune réservation ce mois
                    </p>
                  ) : (
                    <div>
                      {uniqueBookings.map((b) => (
                        <Link
                          key={b.id}
                          href={`/admin/reservations/${b.id}`}
                          className="flex items-center gap-3 px-4 py-3 hover:opacity-80 transition-opacity"
                          style={{
                            borderBottom: "1px solid var(--admin-border-light)",
                          }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{
                              background:
                                b.status === "confirmed"
                                  ? "#16A34A"
                                  : "#EAB308",
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-[13.5px] font-semibold truncate"
                              style={{ color: "var(--admin-text)" }}
                            >
                              {b.guestName}
                            </p>
                            <p
                              className="text-[12px]"
                              style={{ color: "var(--admin-text-muted)" }}
                            >
                              {new Date(b.checkIn).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                              })}{" "}
                              →{" "}
                              {new Date(b.checkOut).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                          </div>
                          <Icon.ArrowRight
                            size={14}
                            style={{ color: "var(--admin-text-subtle)" }}
                          />
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Desktop : timeline grid */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--admin-border)" }}>
                    <th
                      className="text-left font-bold sticky left-0 z-10"
                      style={{
                        padding: "12px 16px",
                        width: 140,
                        background: "var(--admin-surface)",
                        color: "var(--admin-text-muted)",
                        fontSize: 11.5,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Chambre
                    </th>
                    {calendar.days.map((day) => {
                      const isToday =
                        day.toDateString() === new Date().toDateString();
                      return (
                        <th
                          key={day.getTime()}
                          className="text-center font-bold min-w-[28px]"
                          style={{
                            padding: "12px 4px",
                            color: isToday
                              ? "var(--admin-accent)"
                              : "var(--admin-text-muted)",
                            fontSize: 11.5,
                          }}
                        >
                          {day.getDate()}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {activeChambres.map((chambre) => {
                    const roomBookings = bookings.filter(
                      (b) => b.roomId === chambre.id,
                    );
                    return (
                      <tr
                        key={chambre.id}
                        style={{
                          borderBottom: "1px solid var(--admin-border-light)",
                        }}
                      >
                        <td
                          className="font-semibold sticky left-0 z-10"
                          style={{
                            padding: "8px 16px",
                            background: "var(--admin-surface)",
                            color: "var(--admin-text)",
                            fontSize: 13,
                          }}
                        >
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
                          const blocked = isDateBlocked(chambre.id, day);
                          return (
                            <td
                              key={day.getTime()}
                              className="p-[2px] text-center"
                            >
                              {booking ? (
                                <Link
                                  href={`/admin/reservations/${booking.id}`}
                                  title={booking.guestName}
                                  className={`block w-full h-6 rounded ${STATUS_COLORS[booking.status]}`}
                                />
                              ) : blocked ? (
                                <div
                                  className={`block w-full h-6 rounded flex items-center justify-center text-[11px] font-bold ${STATUS_COLORS.blocked}`}
                                  title="Bloqué"
                                >
                                  ✕
                                </div>
                              ) : (
                                <div
                                  className="block w-full h-6 rounded"
                                  style={{
                                    background: "var(--admin-surface-2)",
                                  }}
                                />
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
          </Card>
        </>
      )}

      {/* Légende */}
      <div className="flex flex-wrap gap-4 text-[12px] font-semibold">
        <Legend color="bg-amber-300" label="En attente" />
        <Legend color="bg-emerald-400" label="Confirmée" />
        <Legend color="bg-sky-300" label="Terminée" />
        <Legend color="bg-red-200" label="Bloqué" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5" style={{ color: "var(--admin-text-muted)" }}>
      <span className={`w-3 h-3 rounded-sm inline-block ${color}`} />
      {label}
    </span>
  );
}
