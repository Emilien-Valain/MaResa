import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms } from "@/db/schema";
import { blockedDates, coalesce } from "@/lib/holds";

/**
 * GET /api/ical/[roomId]
 *
 * Export iCal public (pas d'auth) — l'URL est le secret.
 * Airbnb/Booking pollent cette URL pour bloquer les dates occupées.
 *
 * Mirror exact de la disponibilité (ADR-0004) : ré-exporte TOUT ce qui rend la
 * chambre indisponible — bookings pending/confirmed + iCal blocks importés +
 * manual blocks — via le seam `blockedDates` (ADR-0007), recollé en intervalles.
 */

/** Horizon forward exporté, en jours (~24 mois). */
const HORIZON_DAYS = 730;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;

  // Vérifier que la chambre existe et est active
  const room = await db.query.rooms.findFirst({
    where: and(eq(rooms.id, roomId), eq(rooms.active, true)),
    columns: { id: true, name: true, tenantId: true },
  });

  if (!room) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Fenêtre forward [aujourd'hui, +HORIZON_DAYS[ en dates UTC
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + HORIZON_DAYS * 86_400_000);

  const held = await blockedDates(roomId, room.tenantId, { start, end });
  const intervals = coalesce(held);

  const now = new Date();
  const stamp = formatIcalDate(now);

  const events = intervals
    .map((iv) => {
      const uid = `hold-${formatIcalDateOnly(iv.start)}-${formatIcalDateOnly(iv.end)}@directloc`;
      return [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${formatIcalDateOnly(iv.start)}`,
        `DTEND;VALUE=DATE:${formatIcalDateOnly(iv.end)}`,
        `SUMMARY:Indisponible`,
        `STATUS:CONFIRMED`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DirectLoc//FR",
    `X-WR-CALNAME:${room.name}`,
    "METHOD:PUBLISH",
    "CALSCALE:GREGORIAN",
    events,
    "END:VCALENDAR",
  ]
    .filter((line) => line !== "")
    .join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${roomId}.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

/** Format: 20250715T140000Z */
function formatIcalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Format: 20250715 (date-only, pour DTSTART;VALUE=DATE) */
function formatIcalDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}
