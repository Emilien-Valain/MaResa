"use server";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms } from "@/db/schema";
import { blockedDates } from "@/lib/holds";

/**
 * Disponibilité = complément des Holds (voir lib/holds.ts, ADR-0007).
 * Ces fonctions dérivent toutes du seam `blockedDates` ; le prédicat d'overlap
 * et l'expansion de récurrence vivent dans le module Hold, pas ici.
 */

/**
 * Retourne true si la chambre est disponible pour la période [checkIn, checkOut[.
 * Tient compte des bookings pending/confirmed, des iCal blocks et des manual
 * blocks (récurrents inclus).
 */
export async function isRoomAvailable(
  roomId: string,
  tenantId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<boolean> {
  const held = await blockedDates(roomId, tenantId, { start: checkIn, end: checkOut });
  return held.size === 0;
}

/**
 * Retourne toutes les chambres actives d'un tenant disponibles pour la période
 * [checkIn, checkOut[. Chaque chambre est testée contre le même seam que
 * isRoomAvailable — plus de divergence entre liste et check unitaire (ADR-0007).
 */
export async function getAvailableRooms(tenantId: string, checkIn: Date, checkOut: Date) {
  const allRooms = await db
    .select()
    .from(rooms)
    .where(and(eq(rooms.tenantId, tenantId), eq(rooms.active, true)))
    .orderBy(asc(rooms.createdAt));

  const window = { start: checkIn, end: checkOut };
  const results = await Promise.all(
    allRooms.map(async (room) => {
      const held = await blockedDates(room.id, tenantId, window);
      return held.size === 0 ? room : null;
    }),
  );

  return results.filter((r): r is (typeof allRooms)[number] => r !== null);
}

/**
 * Retourne la liste des dates bloquées dans la période [from, to[.
 * Utilisé par le date picker pour griser les jours indisponibles.
 */
export async function getBlockedDates(
  roomId: string,
  tenantId: string,
  from: Date,
  to: Date,
): Promise<Date[]> {
  const held = await blockedDates(roomId, tenantId, { start: from, end: to });
  return [...held]
    .sort()
    .map((d) => new Date(d + "T00:00:00.000Z"));
}
