import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { insertManualBlock, deleteManualBlock } from "../helpers/manual-blocks";
import { insertBookingRule, deleteBookingRule, deleteBookingsByEmail, countBookingsByEmail } from "../helpers/intake";
import { fd } from "../helpers/dates";
import { submitManualBookingForm, SAVED_BOOKING_URL } from "../helpers/confirm";

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
  opts: { name: string; email: string; checkIn: string; checkOut: string; force?: boolean; guests?: string },
) {
  await page.goto("/admin/reservations/new");
  await page.locator('select[name="roomId"]').selectOption(ctx.apiRoomId);
  await page.fill('[name="guestName"]', opts.name);
  await page.fill('[name="guestEmail"]', opts.email);
  await page.fill('[name="guestCount"]', opts.guests ?? "1");
  await page.locator('[name="checkIn"]').fill(opts.checkIn);
  await page.locator('[name="checkOut"]').fill(opts.checkOut);
  await submitManualBookingForm(page, opts.force);
  await page.waitForLoadState("networkidle").catch(() => {});
}

test.describe("Admin — Admission des réservations (admitBooking)", () => {
  // ─── Thread #1 : overlap manuel ───────────────────────────────────────────────

  test("« Forcer » n'est pas proposé avant un conflit", async ({ page }) => {
    await page.goto("/admin/reservations/new");
    await expect(page.locator('select[name="roomId"]')).toBeVisible();
    await expect(page.locator('input[name="force"]')).toHaveCount(0);
  });

  test("réservation manuelle sur des dates occupées est refusée sans « Forcer »", async ({ page }) => {
    const email = `nobrute-${RUN_ID}@example.com`;
    // Occupe [2027-03-01, 2027-03-05) sur la chambre API
    const blockId = await insertManualBlock({
      tenantId: ctx.tenantId,
      roomId: ctx.apiRoomId,
      startDate: new Date(fd("2027-03-01") + "T00:00:00.000Z"),
      endDate: new Date(fd("2027-03-05") + "T00:00:00.000Z"),
      recurring: false,
    });

    try {
      await submitManualBooking(page, {
        name: `Sans Force ${RUN_ID}`,
        email,
        checkIn: fd("2027-03-02"),
        checkOut: fd("2027-03-04"), // chevauche le blocage
      });

      // Conflit expliqué dans le formulaire, saisie conservée, override proposé seulement maintenant
      await expect(page.getByText("Ces dates chevauchent")).toBeVisible();
      await expect(page.locator('[name="guestName"]')).toHaveValue(`Sans Force ${RUN_ID}`);
      await expect(page.locator('[name="roomId"]')).toHaveValue(ctx.apiRoomId);
      await expect(page.locator('input[name="force"]')).toBeVisible();

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
      startDate: new Date(fd("2027-03-01") + "T00:00:00.000Z"),
      endDate: new Date(fd("2027-03-05") + "T00:00:00.000Z"),
      recurring: false,
    });

    try {
      await submitManualBooking(page, {
        name: guestName,
        email,
        checkIn: fd("2027-03-02"),
        checkOut: fd("2027-03-04"),
        force: true,
      });

      // Override : arrivée sur le détail de la résa créée
      await expect(page).toHaveURL(SAVED_BOOKING_URL);
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
        checkIn: fd("2027-04-01"),
        checkOut: fd("2027-04-02"),
      });

      await expect(page).toHaveURL(SAVED_BOOKING_URL);
      await expect(page.getByText(guestName).first()).toBeVisible();
    } finally {
      await deleteBookingRule(ruleId);
      await deleteBookingsByEmail(ctx.tenantId, email);
    }
  });

  // ─── Capacité (audit 2026-10/05) ──────────────────────────────────────────────

  test("capacité : 3 voyageurs sur une chambre de 2 refusés, 2 acceptés (limite)", async ({ page }) => {
    const email = `capa-${RUN_ID}@example.com`;
    try {
      await submitManualBooking(page, {
        name: `Trop Nombreux ${RUN_ID}`,
        email,
        checkIn: fd("2027-05-03"),
        checkOut: fd("2027-05-05"),
        guests: "3",
      });
      await expect(page.getByText("Cette chambre accueille 2 personnes maximum").first()).toBeVisible();
      await expect(page.locator('[name="guestName"]')).toHaveValue(`Trop Nombreux ${RUN_ID}`);
      expect(await countBookingsByEmail(ctx.tenantId, email)).toBe(0);

      await submitManualBooking(page, {
        name: `Juste Assez ${RUN_ID}`,
        email,
        checkIn: fd("2027-05-03"),
        checkOut: fd("2027-05-05"),
        guests: "2",
      });
      await expect(page).toHaveURL(SAVED_BOOKING_URL);
      expect(await countBookingsByEmail(ctx.tenantId, email)).toBe(1);
    } finally {
      await deleteBookingsByEmail(ctx.tenantId, email);
    }
  });

  // ─── Isolation multi-tenant (ownership) ───────────────────────────────────────

  // L'UI ne liste que les chambres du tenant : impossible de POSTer un roomId
  // étranger via le formulaire. La garde d'ownership de admitBooking (« Chambre
  // introuvable » sur tenant/roomId dépareillés) est exercée côté public par
  // e2e/public/availability.spec.ts (isolation multi-tenant) et au niveau du seam.
  test.skip("réservation manuelle sur la chambre d'un autre tenant est refusée (non POSTable via l'UI)", async () => {});

  // ─── Concurrence : verrou d'admission par chambre ─────────────────────────────

  test("deux saisies simultanées sur les mêmes nuits : une seule réservation est créée", async ({ page, context }) => {
    const email = `race-${RUN_ID}@example.com`;
    const other = await context.newPage();
    try {
      for (const [p, n] of [[page, "A"], [other, "B"]] as const) {
        await p.goto("/admin/reservations/new");
        await p.locator('select[name="roomId"]').selectOption(ctx.apiRoomId);
        await p.fill('[name="guestName"]', `Course ${n} ${RUN_ID}`);
        await p.fill('[name="guestEmail"]', email);
        await p.locator('[name="checkIn"]').fill(fd("2027-09-06"));
        await p.locator('[name="checkOut"]').fill(fd("2027-09-09"));
      }
      // Les deux formulaires partent en même temps : sans verrou, chacun voit la chambre libre.
      await Promise.all([page.click('[type="submit"]'), other.click('[type="submit"]')]);
      await Promise.all([page, other].map((p) => p.waitForLoadState("networkidle").catch(() => {})));

      await expect.poll(() => countBookingsByEmail(ctx.tenantId, email)).toBe(1);
      const conflicts = await Promise.all(
        [page, other].map((p) => p.getByText("Ces dates chevauchent").count()),
      );
      expect(conflicts.reduce((a, b) => a + b, 0)).toBe(1);
    } finally {
      await other.close();
      await deleteBookingsByEmail(ctx.tenantId, email);
    }
  });
});
