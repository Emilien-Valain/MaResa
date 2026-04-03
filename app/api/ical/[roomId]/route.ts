import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms, bookings } from "@/db/schema";

/**
 * GET /api/ical/[roomId]
 *
 * Export iCal public (pas d'auth) — l'URL est le secret.
 * Airbnb/Booking pollent cette URL pour bloquer les dates occupées.
 */
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

  // Récupérer les réservations pending + confirmed
  const activeBookings = await db
    .select({
      id: bookings.id,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.roomId, roomId),
        eq(bookings.tenantId, room.tenantId),
        or(eq(bookings.status, "pending"), eq(bookings.status, "confirmed")),
      ),
    );

  const now = new Date();
  const stamp = formatIcalDate(now);

  const events = activeBookings
    .map((b) => {
      return [
        "BEGIN:VEVENT",
        `UID:booking-${b.id}@marisa`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${formatIcalDateOnly(b.checkIn)}`,
        `DTEND;VALUE=DATE:${formatIcalDateOnly(b.checkOut)}`,
        `SUMMARY:Réservé`,
        `STATUS:CONFIRMED`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MaResa Booking Manager//FR",
    `X-WR-CALNAME:${room.name}`,
    "METHOD:PUBLISH",
    "CALSCALE:GREGORIAN",
    events,
    "END:VCALENDAR",
  ].join("\r\n");

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
