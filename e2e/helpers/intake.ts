/**
 * Helpers pour les tests d'admission de réservation (Candidate B / ADR-0008).
 * Insertion de booking-rules et nettoyage des bookings créés via l'UI admin.
 */

import { and, eq, like } from "drizzle-orm";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { bookingRules, bookings, pricingRules, rooms } from "../../db/schema";

function getDb() {
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
  return { db: drizzle(pool), pool };
}

/** Insère une booking-rule (globale si roomId omis) et retourne son id. */
export async function insertBookingRule(input: {
  tenantId: string;
  roomId?: string | null;
  minStay?: number | null;
  maxStay?: number | null;
  allowedCheckInDays?: number[] | null;
  allowedCheckOutDays?: number[] | null;
  priority?: number;
  validFrom?: Date | null;
  validTo?: Date | null;
}): Promise<string> {
  const { db, pool } = getDb();
  const [row] = await db
    .insert(bookingRules)
    .values({
      tenantId: input.tenantId,
      roomId: input.roomId ?? null,
      minStay: input.minStay ?? null,
      maxStay: input.maxStay ?? null,
      allowedCheckInDays: input.allowedCheckInDays ?? null,
      allowedCheckOutDays: input.allowedCheckOutDays ?? null,
      priority: input.priority ?? 0,
      validFrom: input.validFrom ?? null,
      validTo: input.validTo ?? null,
    })
    .returning({ id: bookingRules.id });
  await pool.end();
  return row.id;
}

export async function deleteBookingRule(id: string): Promise<void> {
  const { db, pool } = getDb();
  await db.delete(bookingRules).where(eq(bookingRules.id, id));
  await pool.end();
}

/** Insère une pricing-rule (globale si roomId omis) et retourne son id. */
export async function insertPricingRule(input: {
  tenantId: string;
  roomId?: string | null;
  name?: string;
  fixedPrice?: string | null; // decimal string, ex "150.00"
  percentageModifier?: string | null; // decimal string, ex "-30.00"
  priority?: number;
  validFrom?: Date | null;
  validTo?: Date | null;
  daysOfWeek?: number[] | null;
}): Promise<string> {
  const { db, pool } = getDb();
  const [row] = await db
    .insert(pricingRules)
    .values({
      tenantId: input.tenantId,
      roomId: input.roomId ?? null,
      name: input.name ?? "Test rule",
      fixedPrice: input.fixedPrice ?? null,
      percentageModifier: input.percentageModifier ?? null,
      priority: input.priority ?? 0,
      validFrom: input.validFrom ?? null,
      validTo: input.validTo ?? null,
      daysOfWeek: input.daysOfWeek ?? null,
      active: true,
    })
    .returning({ id: pricingRules.id });
  await pool.end();
  return row.id;
}

export async function deletePricingRule(id: string): Promise<void> {
  const { db, pool } = getDb();
  await db.delete(pricingRules).where(eq(pricingRules.id, id));
  await pool.end();
}

/** Supprime les bookings d'un tenant pour un email donné (cleanup UI). */
export async function deleteBookingsByEmail(tenantId: string, email: string): Promise<void> {
  const { db, pool } = getDb();
  await db
    .delete(bookings)
    .where(and(eq(bookings.tenantId, tenantId), eq(bookings.guestEmail, email)));
  await pool.end();
}

/** Nombre de bookings non annulés du tenant pour cet email. */
export async function countBookingsByEmail(tenantId: string, email: string): Promise<number> {
  const { db, pool } = getDb();
  const rows = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.tenantId, tenantId), eq(bookings.guestEmail, email)));
  await pool.end();
  return rows.length;
}

/** Supprime les chambres du tenant dont le nom contient `fragment` (filet de nettoyage des specs chambres). */
export async function deleteRoomsByNameFragment(tenantId: string, fragment: string): Promise<void> {
  const { db, pool } = getDb();
  await db
    .delete(rooms)
    .where(and(eq(rooms.tenantId, tenantId), like(rooms.name, `%${fragment}%`)));
  await pool.end();
}

/** Chambres du tenant portant exactement ce nom (id + slug), dans l'ordre de création. */
export async function getRoomsByName(tenantId: string, name: string): Promise<{ id: string; slug: string }[]> {
  const { db, pool } = getDb();
  const rows = await db
    .select({ id: rooms.id, slug: rooms.slug })
    .from(rooms)
    .where(and(eq(rooms.tenantId, tenantId), eq(rooms.name, name)))
    .orderBy(rooms.createdAt);
  await pool.end();
  return rows;
}

/** Supprime les chambres du tenant portant exactement ce nom. */
export async function deleteRoomsByName(tenantId: string, name: string): Promise<void> {
  const { db, pool } = getDb();
  await db.delete(rooms).where(and(eq(rooms.tenantId, tenantId), eq(rooms.name, name)));
  await pool.end();
}

/** Crée une chambre inactive (invisible côté public, hors taux d'occupation) pour isoler des fixtures. */
export async function insertHiddenRoom(tenantId: string, name: string): Promise<string> {
  const { db, pool } = getDb();
  const [any] = await db
    .select({ propertyId: rooms.propertyId })
    .from(rooms)
    .where(eq(rooms.tenantId, tenantId))
    .limit(1);
  const [row] = await db
    .insert(rooms)
    .values({
      tenantId,
      propertyId: any.propertyId,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      pricePerNight: "100",
      active: false,
    })
    .returning({ id: rooms.id });
  await pool.end();
  return row.id;
}

/** Insère des réservations brutes (sans contrôle de disponibilité) — dates en UTC minuit. */
export async function insertBookings(
  rows: {
    tenantId: string;
    roomId: string;
    guestName: string;
    guestEmail: string;
    checkIn: Date;
    checkOut: Date;
    status: "pending" | "confirmed" | "completed" | "cancelled";
  }[],
): Promise<void> {
  const { db, pool } = getDb();
  await db.insert(bookings).values(rows.map((r) => ({ ...r, totalPrice: "200" })));
  await pool.end();
}

/** Supprime les règles tarifaires du tenant portant ce nom exact. */
export async function deletePricingRulesByName(tenantId: string, name: string): Promise<void> {
  const { db, pool } = getDb();
  await db
    .delete(pricingRules)
    .where(and(eq(pricingRules.tenantId, tenantId), eq(pricingRules.name, name)));
  await pool.end();
}
