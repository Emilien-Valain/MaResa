import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Paiement > Webhook Stripe
 * Référence Obsidian : Phase 5.1 — Stripe
 */

test.describe("Paiement — Webhook Stripe", () => {
  test.skip("checkout.session.completed passe le booking en confirmed", async ({ request }) => {
    // TODO: implémenter une fois la Phase 5.1 développée
    // Simuler un événement Stripe signé avec la clé test
  });

  test.skip("checkout.session.expired passe le booking en cancelled", async ({ request }) => {
    // TODO: implémenter une fois la Phase 5.1 développée
  });
});
