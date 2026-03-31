import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Spécification : Tests de non-régression > API > Disponibilité
 * Référence Obsidian : Phase 3.1 — Logique de disponibilité
 *
 * Stratégie :
 * - L'API est testée directement via page.request.get() (pas d'UI)
 * - tenantId et roomId viennent de e2e/.auth/test-context.json (seedé par globalSetup)
 * - La chambre "Chambre API Test" a une réservation confirmée du 2026-06-10 au 2026-06-15
 * - Les tests couvrent : happy path, chevauchements partiels, dates adjacentes, validation, sécurité
 */

// Charger le contexte de test seedé par globalSetup
const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as {
  tenantId: string;
  apiRoomId: string;
  bookedCheckIn: string;  // "2026-06-10"
  bookedCheckOut: string; // "2026-06-15"
};

function apiUrl(params: Record<string, string>) {
  const q = new URLSearchParams(params);
  return `/api/availability?${q.toString()}`;
}

// Paramètres de base valides (période libre — avant la réservation de test)
function freeParams(overrides: Partial<Record<string, string>> = {}) {
  return {
    roomId: ctx.apiRoomId,
    tenantId: ctx.tenantId,
    from: "2026-05-01",
    to: "2026-05-05",
    ...overrides,
  };
}

// ─── Happy path ────────────────────────────────────────────────────────────────

test.describe("API — Disponibilité", () => {
  test("GET /api/availability retourne disponible si aucune réservation", async ({ page }) => {
    const res = await page.request.get(apiUrl(freeParams()));
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(body.blockedDates).toEqual([]);
  });

  test("GET /api/availability retourne indisponible si chevauchement avec réservation confirmée", async ({ page }) => {
    const res = await page.request.get(
      apiUrl(freeParams({ from: ctx.bookedCheckIn, to: ctx.bookedCheckOut })),
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(false);
    // La réservation couvre les nuits 10→14 juin (5 nuits, checkout le 15 exclu)
    expect(body.blockedDates).toHaveLength(5);
    expect(body.blockedDates).toContain("2026-06-10");
    expect(body.blockedDates).toContain("2026-06-14");
  });

  // ─── Chevauchements partiels ─────────────────────────────────────────────────

  test("chevauchement partiel au début — arrivée avant le checkout", async ({ page }) => {
    // [2026-06-13, 2026-06-17[ chevauche [2026-06-10, 2026-06-15[
    const res = await page.request.get(
      apiUrl(freeParams({ from: "2026-06-13", to: "2026-06-17" })),
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(false);
    expect(body.blockedDates).toContain("2026-06-13");
    expect(body.blockedDates).toContain("2026-06-14");
    expect(body.blockedDates).not.toContain("2026-06-15"); // checkout exclu
    expect(body.blockedDates).not.toContain("2026-06-16"); // après la réservation
  });

  test("chevauchement partiel à la fin — départ après le checkin", async ({ page }) => {
    // [2026-06-08, 2026-06-12[ chevauche [2026-06-10, 2026-06-15[
    const res = await page.request.get(
      apiUrl(freeParams({ from: "2026-06-08", to: "2026-06-12" })),
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(false);
    expect(body.blockedDates).toContain("2026-06-10");
    expect(body.blockedDates).toContain("2026-06-11");
    expect(body.blockedDates).not.toContain("2026-06-08"); // avant la réservation
    expect(body.blockedDates).not.toContain("2026-06-09");
  });

  test("période englobant entièrement la réservation — disponible hors réservation", async ({ page }) => {
    // [2026-06-05, 2026-06-20[ contient [2026-06-10, 2026-06-15[
    const res = await page.request.get(
      apiUrl(freeParams({ from: "2026-06-05", to: "2026-06-20" })),
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(false);
    expect(body.blockedDates).toContain("2026-06-10");
    expect(body.blockedDates).toContain("2026-06-14");
    // Les jours hors réservation ne sont pas dans blockedDates
    expect(body.blockedDates).not.toContain("2026-06-05");
    expect(body.blockedDates).not.toContain("2026-06-15");
    expect(body.blockedDates).not.toContain("2026-06-19");
  });

  // ─── Dates adjacentes (boundary) ─────────────────────────────────────────────

  test("arriver le jour du checkout de la réservation précédente — disponible", async ({ page }) => {
    // La réservation finit le 2026-06-15 → arriver le 15 est possible (exclusion stricte)
    const res = await page.request.get(
      apiUrl(freeParams({ from: "2026-06-15", to: "2026-06-18" })),
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(body.blockedDates).toEqual([]);
  });

  test("partir le jour du checkin de la réservation suivante — disponible", async ({ page }) => {
    // La réservation commence le 2026-06-10 → partir le 10 est possible
    const res = await page.request.get(
      apiUrl(freeParams({ from: "2026-06-07", to: "2026-06-10" })),
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(body.blockedDates).toEqual([]);
  });

  // ─── Validation des paramètres ───────────────────────────────────────────────

  test("retourne 400 si roomId manquant", async ({ page }) => {
    const res = await page.request.get(
      apiUrl({ tenantId: ctx.tenantId, from: "2026-05-01", to: "2026-05-05" }),
    );
    expect(res.status()).toBe(400);
  });

  test("retourne 400 si tenantId manquant", async ({ page }) => {
    const res = await page.request.get(
      apiUrl({ roomId: ctx.apiRoomId, from: "2026-05-01", to: "2026-05-05" }),
    );
    expect(res.status()).toBe(400);
  });

  test("retourne 400 si from manquant", async ({ page }) => {
    const res = await page.request.get(
      apiUrl({ roomId: ctx.apiRoomId, tenantId: ctx.tenantId, to: "2026-05-05" }),
    );
    expect(res.status()).toBe(400);
  });

  test("retourne 400 si dates invalides (format non-date)", async ({ page }) => {
    const res = await page.request.get(
      apiUrl(freeParams({ from: "not-a-date", to: "2026-05-05" })),
    );
    expect(res.status()).toBe(400);
  });

  test("retourne 400 si checkOut = checkIn (0 nuit)", async ({ page }) => {
    const res = await page.request.get(
      apiUrl(freeParams({ from: "2026-05-05", to: "2026-05-05" })),
    );
    expect(res.status()).toBe(400);
  });

  test("retourne 400 si checkOut < checkIn (dates inversées)", async ({ page }) => {
    const res = await page.request.get(
      apiUrl(freeParams({ from: "2026-05-10", to: "2026-05-01" })),
    );
    expect(res.status()).toBe(400);
  });

  // ─── Isolation multi-tenant ──────────────────────────────────────────────────

  test("roomId inexistant → disponible (pas de fuite inter-tenant)", async ({ page }) => {
    // Un UUID qui n'existe pas → aucune réservation trouvée → disponible
    const res = await page.request.get(
      apiUrl(freeParams({
        roomId: "00000000-0000-0000-0000-000000000000",
        from: ctx.bookedCheckIn,
        to: ctx.bookedCheckOut,
      })),
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(body.blockedDates).toEqual([]);
  });

  test("tenantId différent ne voit pas les réservations du tenant test", async ({ page }) => {
    // Même roomId, autre tenantId → les réservations du tenant test ne fuient pas
    const res = await page.request.get(
      apiUrl({
        roomId: ctx.apiRoomId,
        tenantId: "00000000-0000-0000-0000-000000000000",
        from: ctx.bookedCheckIn,
        to: ctx.bookedCheckOut,
      }),
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(body.blockedDates).toEqual([]);
  });

  // ─── iCal (Phase 6) ─────────────────────────────────────────────────────────

  test.skip("retourne indisponible si chevauchement avec blocage iCal", async ({ page }) => {
    // TODO: implémenter quand la Phase 6 (import iCal) est prête
    // Le global-setup devra créer un ical_source + ical_block pour tester cela
  });
});
