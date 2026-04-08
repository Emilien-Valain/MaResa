/**
 * Nettoyage des tables rules avant les tests qui dépendent d'un état DB propre.
 * Appelé en beforeAll dans les tests availability/booking-flow pour éviter
 * les interférences avec les tests admin rules.
 */

import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { manualBlocks, bookingRules, pricingRules } from "../../db/schema";

export async function cleanRules(tenantId: string) {
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL!,
  });
  const db = drizzle(pool);

  await db.delete(manualBlocks).where(eq(manualBlocks.tenantId, tenantId));
  await db.delete(bookingRules).where(eq(bookingRules.tenantId, tenantId));
  await db.delete(pricingRules).where(eq(pricingRules.tenantId, tenantId));

  await pool.end();
}
