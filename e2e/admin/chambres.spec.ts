import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Admin > Gestion des chambres
 * Référence Obsidian : Phase 2.2 — Admin : gestion des chambres
 */

test.describe("Admin — Gestion des chambres", () => {
  test.skip("liste des chambres est accessible depuis /admin/chambres", async ({ page }) => {
    // TODO: implémenter une fois la Phase 2.2 développée
    await page.goto("/admin/chambres");
    await expect(page.getByRole("heading", { name: /chambres/i })).toBeVisible();
  });

  test.skip("création d'une chambre avec tous les champs obligatoires", async ({ page }) => {
    // TODO: implémenter une fois la Phase 2.2 développée
    await page.goto("/admin/chambres/new");
    await page.fill('[name="nom"]', "Suite Panoramique");
    await page.fill('[name="prix"]', "150");
    await page.fill('[name="capacite"]', "2");
    await page.click('[type="submit"]');
    await expect(page.getByText("Suite Panoramique")).toBeVisible();
  });

  test.skip("modification d'une chambre existante", async ({ page }) => {
    // TODO: implémenter une fois la Phase 2.2 développée
  });

  test.skip("suppression d'une chambre demande confirmation", async ({ page }) => {
    // TODO: implémenter une fois la Phase 2.2 développée
  });

  test.skip("les chambres d'un tenant ne sont pas visibles par un autre tenant", async ({ page }) => {
    // TODO: implémenter une fois le multi-tenant en place (Phase 1.3 + 2.2)
  });
});
