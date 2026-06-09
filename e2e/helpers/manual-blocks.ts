/**
 * Helpers d'insertion/suppression de blocages manuels pour les tests Hold.
 * Chaque test crée ses propres blocages et les nettoie via l'id retourné
 * (règle de nettoyage : aucun résidu en DB).
 */

import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { manualBlocks } from "../../db/schema";

type ManualBlockInput = {
  tenantId: string;
  roomId: string | null; // null = global (toutes les chambres)
  startDate: Date;
  endDate: Date; // requis par le schéma (NOT NULL) ; ignoré si recurring
  recurring?: boolean;
  recurrenceType?: string | null;
  recurrenceDays?: number[];
  recurrenceUntil?: Date | null;
};

function getDb() {
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
  return { db: drizzle(pool), pool };
}

/** Insère un blocage manuel et retourne son id (pour cleanup). */
export async function insertManualBlock(input: ManualBlockInput): Promise<string> {
  const { db, pool } = getDb();
  const [row] = await db
    .insert(manualBlocks)
    .values({
      tenantId: input.tenantId,
      roomId: input.roomId,
      startDate: input.startDate,
      endDate: input.endDate,
      recurring: input.recurring ?? false,
      recurrenceType: input.recurrenceType ?? null,
      recurrenceDays: input.recurrenceDays ?? [],
      recurrenceUntil: input.recurrenceUntil ?? null,
    })
    .returning({ id: manualBlocks.id });
  await pool.end();
  return row.id;
}

/** Supprime un blocage manuel par id. */
export async function deleteManualBlock(id: string): Promise<void> {
  const { db, pool } = getDb();
  await db.delete(manualBlocks).where(eq(manualBlocks.id, id));
  await pool.end();
}
