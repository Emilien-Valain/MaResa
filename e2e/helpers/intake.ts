/**
 * Helpers pour les tests d'admission de réservation (Candidate B / ADR-0008).
 * Insertion de booking-rules et nettoyage des bookings créés via l'UI admin.
 */

import { and, eq } from "drizzle-orm";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { bookingRules, bookings } from "../../db/schema";

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
}): Promise<string> {
  const { db, pool } = getDb();
  const [row] = await db
    .insert(bookingRules)
    .values({
      tenantId: input.tenantId,
      roomId: input.roomId ?? null,
      minStay: input.minStay ?? null,
      maxStay: input.maxStay ?? null,
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

/** Supprime les bookings d'un tenant pour un email donné (cleanup UI). */
export async function deleteBookingsByEmail(tenantId: string, email: string): Promise<void> {
  const { db, pool } = getDb();
  await db
    .delete(bookings)
    .where(and(eq(bookings.tenantId, tenantId), eq(bookings.guestEmail, email)));
  await pool.end();
}
