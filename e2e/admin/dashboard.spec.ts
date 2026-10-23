import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import {
  deleteBookingsByEmail,
  deleteRoomsByNameFragment,
  insertBookings,
  insertHiddenRoom,
} from "../helpers/intake";
import { todayStart } from "../../lib/date-windows";

/**
 * Spécification : Tests de non-régression > Admin > Dashboard
 * Référence Obsidian : Phase 2 — Admin (dashboard refonte)
 *
 * Le bloc « Aujourd'hui » répond à la question du matin : qui arrive, qui part.
 * Avant la critique du 2026-10-21, « Départs auj. » comptait en fait les 8 prochains départs.
 */

const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as { tenantId: string };

const RUN_ID = Date.now().toString(36).slice(-6);
const EMAIL = "dashboard-today@example.com";
const ROOM = `Dashboard ${RUN_ID}`;
const ARRIVING = `Arrivée Jour ${RUN_ID}`;
const LEAVING = `Départ Jour ${RUN_ID}`;
const TOMORROW = `Arrivée Demain ${RUN_ID}`;
const CANCELLED = `Annulée Jour ${RUN_ID}`;

// Jour relatif à « aujourd'hui » à Paris (même définition que le dashboard), en UTC minuit.
function utcDay(offset: number) {
  const d = todayStart();
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

test.describe("Admin — Dashboard", () => {
  test.beforeAll(async () => {
    await deleteBookingsByEmail(ctx.tenantId, EMAIL);
    const roomId = await insertHiddenRoom(ctx.tenantId, ROOM);
    const base = { tenantId: ctx.tenantId, roomId, guestEmail: EMAIL };
    await insertBookings([
      { ...base, guestName: ARRIVING, checkIn: utcDay(0), checkOut: utcDay(2), status: "confirmed" },
      { ...base, guestName: LEAVING, checkIn: utcDay(-2), checkOut: utcDay(0), status: "confirmed" },
      { ...base, guestName: TOMORROW, checkIn: utcDay(1), checkOut: utcDay(3), status: "pending" },
      { ...base, guestName: CANCELLED, checkIn: utcDay(0), checkOut: utcDay(1), status: "cancelled" },
    ]);
  });

  test.afterAll(async () => {
    await deleteBookingsByEmail(ctx.tenantId, EMAIL);
    await deleteRoomsByNameFragment(ctx.tenantId, RUN_ID);
  });

  // ─── Happy path ────────────────────────────────────────────────────────────

  test("le dashboard affiche le titre et les KPIs", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: /bonjour/i })).toBeVisible();
    await expect(page.getByText("Occupation ce soir")).toBeVisible();
    await expect(page.getByText("Réservé ce mois")).toBeVisible();
    await expect(page.getByText("Réservations ce mois", { exact: true })).toBeVisible();
    // Un seul chiffre d'affaires : plus de CA jour / semaine concurrents
    await expect(page.getByText(/^CA /)).toHaveCount(0);
  });

  test("« Aujourd'hui » nomme les arrivées et départs du jour, et seulement eux", async ({ page }) => {
    await page.goto("/admin");
    const arrivals = page.getByRole("region", { name: "Arrivées" });
    const departures = page.getByRole("region", { name: "Départs" });

    await expect(arrivals.getByText(ARRIVING)).toBeVisible();
    await expect(arrivals.getByText(TOMORROW)).toHaveCount(0);
    await expect(arrivals.getByText(CANCELLED)).toHaveCount(0);
    await expect(arrivals.getByText(LEAVING)).toHaveCount(0);

    const leaving = departures.getByRole("link", { name: new RegExp(LEAVING) });
    await expect(leaving).toBeVisible();
    await expect(leaving).toContainText("Chambre à préparer");
    await expect(departures.getByText(ARRIVING)).toHaveCount(0);

    // Le compteur annoncé = le nombre de personnes listées (régression « Départs auj. »)
    for (const region of [arrivals, departures]) {
      const n = await region.getByRole("listitem").count();
      await expect(region.getByRole("heading")).toContainText(`· ${n}`);
    }

    await leaving.click();
    await expect(page).toHaveURL(/\/admin\/reservations\/[0-9a-f-]{36}$/);
  });

  test("une arrivée de demain est dans « Prochaines arrivées », pas dans « Aujourd'hui »", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator(".arrivals-card").getByText(TOMORROW)).toBeVisible();
    await expect(page.locator(".arrivals-card").getByText(ARRIVING)).toHaveCount(0);
  });

  test("le dashboard affiche la section répartition par canal", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("Réservations par canal")).toBeVisible();
  });

  test("les raccourcis vers Chambres, Nouvelle réservation et Calendrier sont présents", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: /chambres/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /nouvelle réservation/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /calendrier/i }).first()).toBeVisible();
  });

  test("le taux d'occupation affiche un pourcentage valide", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("text=/\\d+%/").first()).toBeVisible();
  });

  // Note : l'accès non authentifié à /admin est testé dans e2e/auth/login.spec.ts
});
