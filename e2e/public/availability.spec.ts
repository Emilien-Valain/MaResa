import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Public > API Disponibilité
 * Référence Obsidian : Phase 3.1 — Moteur de disponibilité
 */

test.describe("API — Disponibilité", () => {
  test.skip("GET /api/availability retourne disponible si aucune réservation", async ({ request }) => {
    // TODO: implémenter une fois la Phase 3.1 développée
    const response = await request.get("/api/availability?roomId=xxx&from=2026-06-01&to=2026-06-05");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.available).toBe(true);
  });

  test.skip("GET /api/availability retourne indisponible si chevauchement avec réservation confirmée", async ({ request }) => {
    // TODO: implémenter une fois la Phase 3.1 développée
  });

  test.skip("GET /api/availability retourne indisponible si chevauchement avec blocage iCal", async ({ request }) => {
    // TODO: implémenter une fois la Phase 6.2 développée
  });
});
