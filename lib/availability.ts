"use server";

import { and, eq, gt, lt, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, icalBlocks } from "@/db/schema";

/**
 * Retourne true si la chambre est disponible pour la période [checkIn, checkOut[.
 *
 * Tient compte :
 * - Des réservations en statut `pending` et `confirmed`
 * - Des blocages iCal importés depuis Airbnb/Booking
 *
 * Condition d'overlap : existing.checkIn < checkOut ET existing.checkOut > checkIn
 */
export async function isRoomAvailable(
  roomId: string,
  tenantId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<boolean> {
  // Vérifier les réservations actives
  const [overlappingBooking] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.roomId, roomId),
        eq(bookings.tenantId, tenantId),
        or(eq(bookings.status, "pending"), eq(bookings.status, "confirmed")),
        lt(bookings.checkIn, checkOut),
        gt(bookings.checkOut, checkIn),
      ),
    )
    .limit(1);

  if (overlappingBooking) return false;

  // Vérifier les blocages iCal
  const [overlappingBlock] = await db
    .select({ id: icalBlocks.id })
    .from(icalBlocks)
    .where(
      and(
        eq(icalBlocks.roomId, roomId),
        eq(icalBlocks.tenantId, tenantId),
        lt(icalBlocks.start, checkOut),
        gt(icalBlocks.end, checkIn),
      ),
    )
    .limit(1);

  return !overlappingBlock;
}

/**
 * Retourne la liste des dates bloquées dans la période [from, to[.
 *
 * Utilisé par le date picker pour griser les jours indisponibles.
 * Tient compte des réservations pending/confirmed et des blocages iCal.
 */
export async function getBlockedDates(
  roomId: string,
  tenantId: string,
  from: Date,
  to: Date,
): Promise<Date[]> {
  const [overlappingBookings, overlappingBlocks] = await Promise.all([
    db
      .select({ checkIn: bookings.checkIn, checkOut: bookings.checkOut })
      .from(bookings)
      .where(
        and(
          eq(bookings.roomId, roomId),
          eq(bookings.tenantId, tenantId),
          or(eq(bookings.status, "pending"), eq(bookings.status, "confirmed")),
          lt(bookings.checkIn, to),
          gt(bookings.checkOut, from),
        ),
      ),

    db
      .select({ start: icalBlocks.start, end: icalBlocks.end })
      .from(icalBlocks)
      .where(
        and(
          eq(icalBlocks.roomId, roomId),
          eq(icalBlocks.tenantId, tenantId),
          lt(icalBlocks.start, to),
          gt(icalBlocks.end, from),
        ),
      ),
  ]);

  const intervals = [
    ...overlappingBookings.map((b) => ({
      start: new Date(b.checkIn),
      end: new Date(b.checkOut),
    })),
    ...overlappingBlocks.map((b) => ({
      start: new Date(b.start),
      end: new Date(b.end),
    })),
  ];

  // Générer l'ensemble des jours bloqués (intersection avec [from, to[)
  const blocked = new Set<string>();
  for (const { start, end } of intervals) {
    const cur = new Date(Math.max(start.getTime(), from.getTime()));
    const rangeEnd = new Date(Math.min(end.getTime(), to.getTime()));
    while (cur < rangeEnd) {
      blocked.add(cur.toISOString().split("T")[0]);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }

  return [...blocked]
    .sort()
    .map((d) => new Date(d + "T00:00:00.000Z"));
}
