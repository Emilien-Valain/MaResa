import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getRoomsByTenant } from "@/lib/queries/rooms";
import { getActiveBookingsForCalendar } from "@/lib/queries/bookings";
import { getManualBlocksForCalendar } from "@/lib/queries/rules";
import IcalSyncButton from "@/components/admin/IcalSyncButton";
import CalendarTimeline, {
  type BookingSpan,
  type BlockSpan,
} from "@/components/admin/CalendarTimeline";
import {
  getCalendarMonth,
  prevMonth,
  nextMonth,
  formatMonthLabel,
} from "@/lib/calendar";
import { Icon } from "@/components/admin/icons";

const VALID_STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;
type Status = (typeof VALID_STATUSES)[number];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

  const activeChambres = chambres.filter((c) => c.active);
  const daysInMonth = calendar.days.length;
  const monthEndExclusive = new Date(
    calendar.lastDay.getFullYear(),
    calendar.lastDay.getMonth(),
    calendar.lastDay.getDate() + 1,
  );

  // ── Build booking spans (clipped to current month) ───────────────────
  const bookingSpans: BookingSpan[] = [];
  for (const b of bookings) {
    if (!VALID_STATUSES.includes(b.status as Status)) continue;
    const checkIn = new Date(b.checkIn);
    const checkOut = new Date(b.checkOut);
    if (checkOut <= calendar.firstDay || checkIn >= monthEndExclusive) continue;
    const startDay =
      checkIn < calendar.firstDay ? 1 : checkIn.getDate();
    const endDay =
      checkOut > monthEndExclusive ? daysInMonth + 1 : checkOut.getDate();
    if (endDay <= startDay) continue;
    bookingSpans.push({
      id: b.id,
      roomId: b.roomId,
      guestName: b.guestName,
      startDay,
      endDay,
      status: b.status as Status,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
    });
  }

  // ── Build block ranges from per-day Set ───────────────────────────────
  const blockedSet = new Set<string>();
  for (const block of rawManualBlocks) {
    const key = block.roomId ?? "__global__";
    if (block.recurring && block.recurrenceType === "weekly") {
      const days = (block.recurrenceDays as number[]) ?? [];
      const cur = new Date(
        Math.max(
          calendar.firstDay.getTime(),
          new Date(block.startDate).getTime(),
        ),
      );
      const end = block.recurrenceUntil
        ? new Date(
            Math.min(
              monthEndExclusive.getTime(),
              new Date(block.recurrenceUntil).getTime(),
            ),
          )
        : monthEndExclusive;
      while (cur < end) {
        if (days.includes(cur.getDay())) {
          blockedSet.add(`${key}|${dateKey(cur)}`);
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      const start = new Date(block.startDate);
      const end = new Date(block.endDate);
      const cur = new Date(Math.max(start.getTime(), calendar.firstDay.getTime()));
      const rangeEnd = new Date(
        Math.min(end.getTime(), monthEndExclusive.getTime()),
      );
      while (cur < rangeEnd) {
        blockedSet.add(`${key}|${dateKey(cur)}`);
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  // Group blocked days into consecutive spans per room
  const blockSpans: BlockSpan[] = [];
  for (const room of activeChambres) {
    let runStart: number | null = null;
    for (let d = 1; d <= daysInMonth; d++) {
      const day = calendar.days[d - 1];
      const k = dateKey(day);
      const blocked =
        blockedSet.has(`${room.id}|${k}`) ||
        blockedSet.has(`__global__|${k}`);
      if (blocked && runStart === null) {
        runStart = d;
      } else if (!blocked && runStart !== null) {
        blockSpans.push({
          roomId: room.id,
          startDay: runStart,
          endDay: d,
        });
        runStart = null;
      }
    }
    if (runStart !== null) {
      blockSpans.push({
        roomId: room.id,
        startDay: runStart,
        endDay: daysInMonth + 1,
      });
    }
  }

  // ── Header data ──────────────────────────────────────────────────────
  const weekdayLabels: string[] = calendar.days.map((d) =>
    d.toLocaleDateString("fr-FR", { weekday: "narrow" }).toUpperCase(),
  );
  const weekendDays: boolean[] = calendar.days.map((d) => {
    const dow = d.getDay();
    return dow === 0 || dow === 6;
  });
  const todayDay =
    now.getFullYear() === year && now.getMonth() === month
      ? now.getDate()
      : null;

  const navButtonStyle = {
    background: "var(--admin-surface)",
    border: "1px solid var(--admin-border)",
    borderRadius: 8,
    padding: "7px 12px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    color: "var(--admin-text-muted)",
    textDecoration: "none" as const,
  };

  return (
    <div className="space-y-4 admin-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-[22px] font-extrabold"
            style={{ color: "var(--admin-text)", letterSpacing: "-0.5px" }}
          >
            Calendrier
          </h1>
          <p
            className="text-[13.5px] mt-0.5 capitalize"
            style={{ color: "var(--admin-text-muted)" }}
          >
            Disponibilités et séjours — {formatMonthLabel(year, month)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <IcalSyncButton />
          <Link
            href={`/admin/calendrier?year=${prev.year}&month=${prev.month}`}
            aria-label="Mois précédent"
            style={navButtonStyle}
          >
            <Icon.ChevronLeft size={16} />
          </Link>
          <div
            style={{
              background: "var(--admin-surface)",
              border: "1px solid var(--admin-border)",
              borderRadius: 8,
              padding: "7px 18px",
              fontSize: 13.5,
              fontWeight: 700,
              color: "var(--admin-text)",
              textTransform: "capitalize",
            }}
          >
            {formatMonthLabel(year, month)}
          </div>
          <Link
            href={`/admin/calendrier?year=${next.year}&month=${next.month}`}
            aria-label="Mois suivant"
            style={navButtonStyle}
          >
            <Icon.ChevronRight size={16} />
          </Link>
          <Link
            href={`/admin/calendrier?year=${now.getFullYear()}&month=${now.getMonth()}`}
            style={{
              background: "var(--admin-primary)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            Aujourd&apos;hui
          </Link>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        <LegendItem color="#16A34A" label="Confirmée" />
        <LegendItem color="#D97706" label="En attente" />
        <LegendItem color="#94A3B8" label="Terminée" />
        <LegendItem color="#DC2626" label="Annulée" />
        <span className="flex items-center gap-1.5">
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background:
                "repeating-linear-gradient(45deg, #CBD5E1, #CBD5E1 2px, transparent 2px, transparent 6px)",
            }}
          />
          <span
            className="text-[12px] font-medium"
            style={{ color: "var(--admin-text-muted)" }}
          >
            Bloqué
          </span>
        </span>
      </div>

      {activeChambres.length === 0 ? (
        <div
          style={{
            padding: "60px 24px",
            textAlign: "center",
            background: "var(--admin-surface)",
            border: "1px solid var(--admin-border)",
            borderRadius: "var(--admin-radius)",
          }}
        >
          <p
            className="text-[14px]"
            style={{ color: "var(--admin-text-muted)" }}
          >
            Aucune chambre active.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile : list per room */}
          <div className="md:hidden space-y-4">
            {activeChambres.map((chambre) => {
              const roomBookings = bookings.filter(
                (b) => b.roomId === chambre.id,
              );
              const uniqueBookings = roomBookings.filter(
                (b, i, arr) => arr.findIndex((x) => x.id === b.id) === i,
              );
              return (
                <div
                  key={chambre.id}
                  style={{
                    background: "var(--admin-surface)",
                    border: "1px solid var(--admin-border)",
                    borderRadius: "var(--admin-radius)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="px-4 py-3"
                    style={{
                      borderBottom: "1px solid var(--admin-border-light)",
                    }}
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
                            borderBottom:
                              "1px solid var(--admin-border-light)",
                          }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{
                              background:
                                b.status === "confirmed"
                                  ? "#16A34A"
                                  : "#D97706",
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
                              {new Date(b.checkIn).toLocaleDateString(
                                "fr-FR",
                                { day: "numeric", month: "short" },
                              )}{" "}
                              →{" "}
                              {new Date(b.checkOut).toLocaleDateString(
                                "fr-FR",
                                { day: "numeric", month: "short" },
                              )}
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
                </div>
              );
            })}
          </div>

          {/* Desktop : timeline */}
          <div className="hidden md:block">
            <CalendarTimeline
              rooms={activeChambres.map((c) => ({ id: c.id, name: c.name }))}
              bookings={bookingSpans}
              blocks={blockSpans}
              daysInMonth={daysInMonth}
              weekdayLabels={weekdayLabels}
              weekendDays={weekendDays}
              todayDay={todayDay}
            />
          </div>
        </>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          background: color,
        }}
      />
      <span
        className="text-[12px] font-medium"
        style={{ color: "var(--admin-text-muted)" }}
      >
        {label}
      </span>
    </span>
  );
}
