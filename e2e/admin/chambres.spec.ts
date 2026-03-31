import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Admin > Gestion des chambres
 * Référence Obsidian : Phase 2.2 — Admin : gestion des chambres
 */

test.describe("Admin — Gestion des chambres", () => {
  test("liste des chambres est accessible depuis /admin/chambres", async ({ page }) => {
    await page.goto("/admin/chambres");
    await expect(page.getByRole("heading", { name: /chambres/i })).toBeVisible();
  });

  test("création d'une chambre avec tous les champs obligatoires", async ({ page }) => {
    await page.goto("/admin/chambres/new");
    await page.fill('[name="nom"]', "Suite Panoramique");
    await page.fill('[name="prix"]', "150");
    await page.fill('[name="capacite"]', "2");
    await page.click('[type="submit"]');
    await expect(page).toHaveURL("/admin/chambres");
    await expect(page.getByText("Suite Panoramique")).toBeVisible();
  });

  test("modification d'une chambre existante", async ({ page }) => {
    // Navigue vers la liste, clique sur modifier sur la première chambre
    await page.goto("/admin/chambres");
    await page.getByRole("link", { name: "Modifier" }).first().click();
    await expect(page).toHaveURL(/\/admin\/chambres\/.+\/edit/);
    await page.fill('[name="nom"]', "Suite Panoramique Modifiée");
    await page.click('[type="submit"]');
    await expect(page).toHaveURL("/admin/chambres");
    await expect(page.getByText("Suite Panoramique Modifiée")).toBeVisible();
  });

  test("suppression d'une chambre demande confirmation", async ({ page }) => {
    await page.goto("/admin/chambres");
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Supprimer" }).first().click();
    // Après suppression la chambre disparaît de la liste
    await expect(page.getByText("Suite Panoramique Modifiée")).not.toBeVisible();
  });

  test.skip("les chambres d'un tenant ne sont pas visibles par un autre tenant", async ({ page }) => {
    // TODO: nécessite deux tenants en DB de test — implémenter quand seed.ts est prêt
  });
});
