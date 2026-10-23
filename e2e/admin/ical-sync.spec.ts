import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { icalBlocks, icalSources } from "../../db/schema";

/**
 * Spécification : Tests de non-régression > Admin > Synchronisation iCal
 *
 * Une plateforme qui répond 200 avec une page HTML (erreur, maintenance, login)
 * ne doit pas être lue comme « plus aucune réservation » : sinon tous les blocs
 * importés sont effacés et la chambre paraît libre sur le site direct.
 */

const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as { tenantId: string; apiRoomId: string };

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
const db = drizzle(pool);
let sourceId: string;

test.beforeAll(async () => {
  // La page de login de l'app elle-même : une vraie réponse 200 en HTML.
  const [source] = await db
    .insert(icalSources)
    .values({
      tenantId: ctx.tenantId,
      roomId: ctx.apiRoomId,
      name: "Source HTML (test)",
      url: "http://localhost:3001/login",
    })
    .returning({ id: icalSources.id });
  sourceId = source.id;
  await db.insert(icalBlocks).values({
    tenantId: ctx.tenantId,
    roomId: ctx.apiRoomId,
    sourceId,
    uid: "html-guard-test",
    summary: "Réservé Airbnb",
    start: new Date("2031-03-10T00:00:00Z"),
    end: new Date("2031-03-14T00:00:00Z"),
  });
});

test.afterAll(async () => {
  await db.delete(icalBlocks).where(eq(icalBlocks.sourceId, sourceId));
  await db.delete(icalSources).where(eq(icalSources.id, sourceId));
  await pool.end();
});

test("iCal : une réponse HTML en 200 n'efface pas les blocs déjà importés", async ({ page }) => {
  const res = await page.request.post("/api/admin/ical-sync");
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).errors).toBeGreaterThanOrEqual(1);

  const blocks = await db.select().from(icalBlocks).where(eq(icalBlocks.sourceId, sourceId));
  expect(blocks).toHaveLength(1);
});
