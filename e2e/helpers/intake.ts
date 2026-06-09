/**
 * Helpers pour les tests d'admission de réservation (Candidate B / ADR-0008).
 * Insertion de booking-rules et nettoyage des bookings créés via l'UI admin.
 */

import { and, eq } from "drizzle-orm";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { bookingRules, bookings, pricingRules } from "../../db/schema";

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
