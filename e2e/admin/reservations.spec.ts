import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Admin > Gestion des réservations
 * Référence Obsidian : Phase 2.3 — Admin : gestion des réservations
 */

test.describe("Admin — Gestion des réservations", () => {
  test.skip("liste des réservations avec filtres date et statut", async ({ page }) => {
    // TODO: implémenter une fois la Phase 2.3 développée
    await page.goto("/admin/reservations");
    await expect(page.getByRole("heading", { name: /réservations/i })).toBeVisible();
  });

  test.skip("création manuelle d'une réservation", async ({ page }) => {
    // TODO: implémenter une fois la Phase 2.3 développée
  });

  test.skip("confirmation d'une réservation pending", async ({ page }) => {
    // TODO: implémenter une fois la Phase 2.3 développée
  });

  test.skip("annulation d'une réservation", async ({ page }) => {
    // TODO: implémenter une fois la Phase 2.3 développée
  });

  test.skip("vue calendrier mensuelle par chambre", async ({ page }) => {
    // TODO: implémenter une fois la Phase 2.3 développée
    await page.goto("/admin/calendrier");
  });
});
