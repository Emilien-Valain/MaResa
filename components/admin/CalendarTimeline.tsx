"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/admin/icons";

const ROOM_LABEL_W = 160;
const MIN_COL_W = 28;
const ROW_H = 56;

type Status = "pending" | "confirmed" | "completed" | "cancelled";

export type BookingSpan = {
  id: string;
  roomId: string;
  guestName: string;
  startDay: number;
  endDay: number;
  status: Status;
  checkIn: string;
  checkOut: string;
};

export type BlockSpan = {
  roomId: string;
  startDay: number;
  endDay: number;
};

type Room = { id: string; name: string };

// Même palette que StatusBadge (DESIGN.md « status-* ») ; border = barre/point, text ≥ 4.5:1 sur bg.
const STATUS_COLOR_MAP: Record<Status, { border: string; bg: string; text: string }> = {
  confirmed: { border: "#16A34A", bg: "#DCFCE7", text: "#15803D" },
  pending: { border: "#D97706", bg: "#FEF9C3", text: "#A16207" },
  completed: { border: "#94A3B8", bg: "#F1F5F9", text: "#475569" },
  cancelled: { border: "#DC2626", bg: "#FEE2E2", text: "#B91C1C" },
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

const STATUS_LABEL: Record<Status, string> = {
  confirmed: "Confirmée",
  pending: "En attente",
  completed: "Terminée",
  cancelled: "Annulée",
};

export default function CalendarTimeline({
  rooms,
  bookings,
  blocks,
  daysInMonth,
  weekdayLabels,
  weekendDays,
  todayDay,
  dateKeys,
  todayKey,
}: {
  rooms: Room[];
  bookings: BookingSpan[];
  blocks: BlockSpan[];
  daysInMonth: number;
  weekdayLabels: string[];
  weekendDays: boolean[];
  todayDay: number | null;
  /** AAAA-MM-JJ de chaque jour du mois (index = jour - 1). */
  dateKeys: string[];
  todayKey: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  // Allow scroll only below this min-width — above it, columns expand to fit.
  const minWidth = ROOM_LABEL_W + daysInMonth * MIN_COL_W;
  const dayPct = 100 / daysInMonth;

  // Helper for day-cell wrappers (header + row backgrounds)
  const dayCellStyle = (d: number, isHeader: boolean) => {
    const isToday = d === todayDay;
    const weekend = weekendDays[d - 1];
    return {
      flex: "1 1 0",
      minWidth: 0,
      textAlign: "center" as const,
      padding: isHeader ? "6px 0" : 0,
      background: isToday
        ? isHeader
          ? "var(--admin-primary-light)"
          : "rgba(42, 92, 64, 0.04)"
        : weekend
          ? "var(--admin-surface-2)"
          : "transparent",
      borderRight: "1px solid var(--admin-border-light)",
      height: isHeader ? "auto" : "100%",
    };
  };

  return (
    <>
      {/* Défilement horizontal : focusable pour le défiler au clavier. */}
      <div
        role="region"
        aria-label="Planning des séjours"
        tabIndex={0}
        style={{
          background: "var(--admin-surface)",
          border: "1px solid var(--admin-border)",
          borderRadius: "var(--admin-radius)",
          overflowX: "auto",
        }}
      >
        <div style={{ minWidth }}>
          {/* Day header row */}
          <div
            style={{
              display: "flex",
              borderBottom: "2px solid var(--admin-border)",
              position: "sticky",
              top: 0,
              background: "var(--admin-surface)",
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: ROOM_LABEL_W,
                flexShrink: 0,
                padding: "10px 16px",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--admin-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                borderRight: "1px solid var(--admin-border)",
                background: "var(--admin-surface)",
                position: "sticky",
                left: 0,
                zIndex: 3,
              }}
            >
              Chambre
            </div>
            {days.map((d) => {
              const isToday = d === todayDay;
              return (
                <div key={d} style={dayCellStyle(d, true)}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: isToday
                        ? "var(--admin-primary)"
                        : "var(--admin-text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    {weekdayLabels[d - 1]}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: isToday ? 800 : 600,
                      color: isToday ? "#fff" : "var(--admin-text)",
                      background: isToday
                        ? "var(--admin-primary)"
                        : "transparent",
                      borderRadius: "50%",
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "2px auto 0",
                    }}
                  >
                    {d}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Room rows */}
          {rooms.map((room, ri) => {
            const roomBookings = bookings.filter((b) => b.roomId === room.id);
            const roomBlocks = blocks.filter((b) => b.roomId === room.id);
            const busy = new Set<number>();
            for (const sp of [...roomBookings, ...roomBlocks])
              for (let d = sp.startDay; d < sp.endDay; d++) busy.add(d);
            return (
              <div
                key={room.id}
                style={{
                  display: "flex",
                  borderBottom:
                    ri < rooms.length - 1
                      ? "1px solid var(--admin-border-light)"
                      : "none",
                  position: "relative",
                  height: ROW_H,
                }}
              >
                {/* Room label — sticky left */}
                <div
                  style={{
                    width: ROOM_LABEL_W,
                    flexShrink: 0,
                    padding: "0 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    borderRight: "1px solid var(--admin-border)",
                    background: "var(--admin-surface)",
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: "var(--admin-primary)",
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--admin-text)",
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {room.name}
                  </div>
                </div>

                {/* Day cells background + spans */}
                <div
                  style={{
                    display: "flex",
                    flex: 1,
                    position: "relative",
                  }}
                >
                  {/* Nuit libre à venir : un clic ouvre une réservation pré-remplie. Au clavier,
                      un seul arrêt par plage libre (son premier jour), pas un par nuit. */}
                  {days.map((d) => {
                    const isFree = (n: number) => !busy.has(n) && dateKeys[n - 1] >= todayKey;
                    if (!isFree(d)) return <div key={d} style={dayCellStyle(d, false)} />;
                    const runStart = d === 1 || !isFree(d - 1);
                    let end = d;
                    while (runStart && end <= days.length && isFree(end)) end++;
                    const day = (n: number) =>
                      // n peut valoir « dernier jour + 1 » (fin de plage) : on part du 1er du mois.
                      new Date(Date.parse(`${dateKeys[0]}T00:00:00Z`) + (n - 1) * 86_400_000).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        timeZone: "UTC",
                      });
                    return (
                      <Link
                        key={d}
                        href={`/admin/reservations/new?roomId=${room.id}&checkIn=${dateKeys[d - 1]}`}
                        tabIndex={runStart ? 0 : -1}
                        aria-hidden={runStart ? undefined : true}
                        aria-label={
                          runStart
                            ? `Réserver ${room.name} à partir du ${day(d)} (libre jusqu'au ${day(end)})`
                            : undefined
                        }
                        title={`Réserver ${room.name} à partir du ${d}`}
                        className="admin-cal-free"
                        style={dayCellStyle(d, false)}
                      />
                    );
                  })}

                  {/* Blocked ranges */}
                  {roomBlocks.map((blk, bi) => {
                    const left = (blk.startDay - 1) * dayPct;
                    const width = (blk.endDay - blk.startDay) * dayPct;
                    return (
                      <div
                        key={bi}
                        title="Bloqué"
                        style={{
                          position: "absolute",
                          top: 8,
                          height: 38,
                          left: `${left}%`,
                          width: `${width}%`,
                          background:
                            "repeating-linear-gradient(45deg, #E2E8F0, #E2E8F0 3px, #F8FAFC 3px, #F8FAFC 9px)",
                          borderRadius: 6,
                          border: "1px solid #CBD5E1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon.Block size={13} style={{ color: "#94A3B8" }} />
                      </div>
                    );
                  })}

                  {/* Booking spans */}
                  {roomBookings.map((bk) => {
                    const left = (bk.startDay - 1) * dayPct;
                    const width = (bk.endDay - bk.startDay) * dayPct;
                    const colors = STATUS_COLOR_MAP[bk.status];
                    const isSelected = selected === bk.id;
                    const summary = `${bk.guestName} · ${shortDate(bk.checkIn)} → ${shortDate(bk.checkOut)} · ${STATUS_LABEL[bk.status]}`;
                    return (
                      <button
                        key={bk.id}
                        type="button"
                        title={summary}
                        aria-label={summary}
                        aria-pressed={isSelected}
                        onClick={() =>
                          setSelected(isSelected ? null : bk.id)
                        }
                        style={{
                          position: "absolute",
                          top: 8,
                          height: 38,
                          left: `calc(${left}% + 2px)`,
                          width: `calc(${width}% - 4px)`,
                          background: colors.bg,
                          border: `1.5px solid ${colors.border}`,
                          borderRadius: 7,
                          display: "flex",
                          alignItems: "center",
                          paddingLeft: 8,
                          gap: 6,
                          cursor: "pointer",
                          overflow: "hidden",
                          boxShadow: isSelected
                            ? `0 0 0 2px ${colors.border}`
                            : "none",
                          transition: "box-shadow 0.15s",
                          zIndex: isSelected ? 2 : 1,
                          textAlign: "left",
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: colors.border,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: colors.text,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {bk.guestName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected booking detail card */}
      {selected &&
        (() => {
          const bk = bookings.find((b) => b.id === selected);
          if (!bk) return null;
          const colors = STATUS_COLOR_MAP[bk.status];
          return (
            <div
              className="admin-fade-in"
              style={{
                marginTop: 16,
                background: "var(--admin-surface)",
                border: "1px solid var(--admin-border)",
                borderRadius: "var(--admin-radius)",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 24,
                boxShadow: "var(--admin-shadow-md)",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--admin-text)",
                  }}
                >
                  {bk.guestName}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--admin-text-muted)",
                    marginTop: 2,
                  }}
                >
                  {new Date(bk.checkIn).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  →{" "}
                  {new Date(bk.checkOut).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "3px 12px",
                  borderRadius: 12,
                  background: colors.bg,
                  color: colors.text,
                }}
              >
                {STATUS_LABEL[bk.status]}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  href={`/admin/reservations/${bk.id}`}
                  style={{
                    background: "var(--admin-primary)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "7px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Voir
                </Link>
                <button
                  type="button"
                  aria-label="Fermer"
                  onClick={() => setSelected(null)}
                  style={{
                    background: "var(--admin-surface-2)",
                    color: "var(--admin-text-muted)",
                    border: "1px solid var(--admin-border)",
                    borderRadius: 8,
                    padding: "7px 12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Icon.X size={14} />
                </button>
              </div>
            </div>
          );
        })()}
    </>
  );
}
