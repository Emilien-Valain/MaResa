import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Cron > Emails automatiques
 * Référence Obsidian : Phase 9.5/9.6 — Rappel J-2 et remerciement post-séjour
 *
 * Stratégie : tester la protection par CRON_SECRET de l'endpoint.
 * Les tests d'envoi réel d'email sont hors scope (pas de SMTP en test).
 */

test.describe("Cron — Booking emails", () => {
  test("endpoint sans Authorization → 401 ou 500 (si CRON_SECRET non configuré)", async ({ request }) => {
    const res = await request.get("/api/cron/booking-emails");
    // 401 si CRON_SECRET configuré, 500 si non configuré
    expect([401, 500]).toContain(res.status());
  });

  test("endpoint avec mauvais secret → 401 ou 500", async ({ request }) => {
    const res = await request.get("/api/cron/booking-emails", {
      headers: { Authorization: "Bearer mauvais-secret" },
    });
    expect([401, 500]).toContain(res.status());
    // Dans tous les cas, pas de 200
    expect(res.status()).not.toBe(200);
  });

  test("endpoint avec bon secret → 200 et JSON valide", async ({ request }) => {
    const secret = process.env.CRON_SECRET;
    test.skip(!secret, "CRON_SECRET non configuré dans l'environnement de test");

    const res = await request.get("/api/cron/booking-emails", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("reminders");
    expect(body).toHaveProperty("thankYous");
    expect(body).toHaveProperty("errors");
  });
});
