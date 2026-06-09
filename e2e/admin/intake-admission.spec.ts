import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { insertManualBlock, deleteManualBlock } from "../helpers/manual-blocks";
import { insertBookingRule, deleteBookingRule, deleteBookingsByEmail } from "../helpers/intake";

/**
 * Spécification : Tests de non-régression > Admin > Admission des réservations
 * Référence Obsidian : ADR-0008 (seam admitBooking) / thread #1
 *
 * L'intake manuel passe désormais par le même gate `admitBooking` que le public :
 *  - dispo contrôlée contre les Holds, SAUF si l'admin coche « Forcer » (override) ;
 *  - booking-rules (minStay…) IGNORÉES côté manuel.
 *
 * On pilote le formulaire admin (/admin/reservations/new). Un rejet (throw dans la
 * server action) ne redirige pas et n'insère rien → la résa est absente de la liste.
 * Dates en 2027 pour ne croiser ni les données seedées (juin 2026) ni les autres
 * tests admin (addDays 5..45). Chaque test nettoie ses données.
 */

const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as { tenantId: string; apiRoomId: string };

const RUN_ID = Date.now().toString(36).slice(-5);

async function submitManualBooking(
  page: Page,
  opts: { name: string; email: string; checkIn: string; checkOut: string; force?: boolean },
) {
  await page.goto("/admin/reservations/new");
  await page.locator('select[name="roomId"]').selectOption(ctx.apiRoomId);
  await page.fill('[name="guestName"]', opts.name);
  await page.fill('[name="guestEmail"]', opts.email);
  await page.fill('[name="guestCount"]', "1");
  await page.locator('[name="checkIn"]').fill(opts.checkIn);
  await page.locator('[name="checkOut"]').fill(opts.checkOut);
  if (opts.force) await page.locator('input[name="force"]').check();
  await page.click('[type="submit"]');
  await page.waitForLoadState("networkidle").catch(() => {});
}

test.describe("Admin — Admission des réservations (admitBooking)", () => {
  // ─── Thread #1 : overlap manuel ───────────────────────────────────────────────

  test("réservation manuelle sur des dates occupées est refusée sans « Forcer »", async ({ page }) => {
    const email = `nobrute-${RUN_ID}@example.com`;
    // Occupe [2027-03-01, 2027-03-05) sur la chambre API
    const blockId = await insertManualBlock({
      tenantId: ctx.tenantId,
      roomId: ctx.apiRoomId,
      startDate: new Date("2027-03-01T00:00:00.000Z"),
      endDate: new Date("2027-03-05T00:00:00.000Z"),
      recurring: false,
    });

    try {
      await submitManualBooking(page, {
        name: `Sans Force ${RUN_ID}`,
        email,
        checkIn: "2027-03-02",
        checkOut: "2027-03-04", // chevauche le blocage
      });

      // Rejet : pas de redirection vers la liste, et la résa n'est pas créée
      await page.goto("/admin/reservations");
      await expect(page.getByText(`Sans Force ${RUN_ID}`)).not.toBeVisible();
    } finally {
      await deleteManualBlock(blockId);
      await deleteBookingsByEmail(ctx.tenantId, email); // au cas où (ne devrait rien supprimer)
    }
  });

  test("réservation manuelle sur des dates occupées est acceptée avec « Forcer »", async ({ page }) => {
    const email = `force-${RUN_ID}@example.com`;
    const guestName = `Avec Force ${RUN_ID}`;
    const blockId = await insertManualBlock({
      tenantId: ctx.tenantId,
      roomId: ctx.apiRoomId,
      startDate: new Date("2027-03-01T00:00:00.000Z"),
      endDate: new Date("2027-03-05T00:00:00.000Z"),
      recurring: false,
    });

    try {
      await submitManualBooking(page, {
        name: guestName,
        email,
        checkIn: "2027-03-02",
        checkOut: "2027-03-04",
        force: true,
      });

      // Override : redirection vers la liste et résa présente
      await expect(page).toHaveURL("/admin/reservations");
      await expect(page.getByText(guestName).first()).toBeVisible();
    } finally {
      await deleteManualBlock(blockId);
      await deleteBookingsByEmail(ctx.tenantId, email);
    }
  });

  // ─── Q2 : les booking-rules ne s'appliquent pas au manuel ─────────────────────

  test("une réservation manuelle ignore les booking-rules (séjour 1 nuit alors que minStay=3)", async ({ page }) => {
    const email = `norules-${RUN_ID}@example.com`;
    const guestName = `Une Nuit ${RUN_ID}`;
    // Règle globale minStay=3 nuits
    const ruleId = await insertBookingRule({ tenantId: ctx.tenantId, minStay: 3 });

    try {
      // 1 nuit sur dates libres → doit passer (règle ignorée côté manuel)
      await submitManualBooking(page, {
        name: guestName,
        email,
        checkIn: "2027-04-01",
        checkOut: "2027-04-02",
      });

      await expect(page).toHaveURL("/admin/reservations");
      await expect(page.getByText(guestName).first()).toBeVisible();
    } finally {
      await deleteBookingRule(ruleId);
      await deleteBookingsByEmail(ctx.tenantId, email);
    }
  });

  // ─── Isolation multi-tenant (ownership) ───────────────────────────────────────

  // L'UI ne liste que les chambres du tenant : impossible de POSTer un roomId
  // étranger via le formulaire. La garde d'ownership de admitBooking (« Chambre
  // introuvable » sur tenant/roomId dépareillés) est exercée côté public par
  // e2e/public/availability.spec.ts (isolation multi-tenant) et au niveau du seam.
  test.skip("réservation manuelle sur la chambre d'un autre tenant est refusée (non POSTable via l'UI)", async () => {});
});
