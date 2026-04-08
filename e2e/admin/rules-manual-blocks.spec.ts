import { test, expect } from "@playwright/test";

const RUN_ID = Date.now().toString(36).slice(-6);

test.describe("Admin — Blocages manuels", () => {
  // ─── Happy path ────────────────────────────────────────────────────────────

  test("la page Règles résa est accessible et affiche les 3 onglets", async ({ page }) => {
    await page.goto("/admin/regles");
    await expect(page.getByRole("heading", { level: 1, name: "Règles de réservation" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Blocages" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Règles de séjour" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tarification" })).toBeVisible();
  });

  test("le lien Règles résa est dans la navigation admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: "Règles résa" })).toBeVisible();
  });

  test("créer un blocage ponctuel par chambre puis le supprimer", async ({ page }) => {
    await page.goto("/admin/regles");

    // Ouvrir le formulaire
    await page.getByRole("button", { name: "Ajouter" }).first().click();

    // Remplir le formulaire
    await page.locator("input[name='startDate']").fill("2026-08-01");
    await page.locator("input[name='endDate']").fill("2026-08-15");

    // Soumettre
    await page.getByRole("button", { name: "Créer le blocage" }).click();

    // Vérifier que le blocage apparaît
    await expect(page.getByText("01/08/2026")).toBeVisible();
    await expect(page.getByText("15/08/2026")).toBeVisible();

    // Supprimer
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Supprimer" }).first().click();

    // Vérifier que c'est supprimé
    await expect(page.getByText("Aucun blocage configuré")).toBeVisible();
  });

  test("créer un blocage global (toutes les chambres)", async ({ page }) => {
    await page.goto("/admin/regles");

    await page.getByRole("button", { name: "Ajouter" }).first().click();

    // Laisser "Toutes les chambres" sélectionné (option par défaut)
    await page.locator("input[name='startDate']").fill("2026-12-24");
    await page.locator("input[name='endDate']").fill("2026-12-26");

    await page.getByRole("button", { name: "Créer le blocage" }).click();

    await expect(page.getByText("Toutes les chambres")).toBeVisible();

    // Cleanup
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Supprimer" }).first().click();
  });

  test("créer un blocage récurrent (tous les lundis)", async ({ page }) => {
    await page.goto("/admin/regles");

    await page.getByRole("button", { name: "Ajouter" }).first().click();

    await page.locator("input[name='startDate']").fill("2026-06-01");
    await page.locator("input[name='endDate']").fill("2026-06-01");

    // Activer la récurrence
    await page.locator("#recurring").check();
    await expect(page.getByText("Jours bloqués")).toBeVisible();

    // Sélectionner lundi (index 1)
    await page.getByRole("button", { name: "Lun" }).click();

    await page.getByRole("button", { name: "Créer le blocage" }).click();

    await expect(page.getByText("Récurrent")).toBeVisible();
    await expect(page.getByText(/Chaque.*Lun/)).toBeVisible();

    // Cleanup
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Supprimer" }).first().click();
  });

  // ─── Calendrier ────────────────────────────────────────────────────────────

  test("les blocages manuels apparaissent dans le calendrier avec ✕", async ({ page }) => {
    // Créer un blocage
    await page.goto("/admin/regles");
    await page.getByRole("button", { name: "Ajouter" }).first().click();
    await page.locator("input[name='startDate']").fill("2026-07-01");
    await page.locator("input[name='endDate']").fill("2026-07-03");
    await page.getByRole("button", { name: "Créer le blocage" }).click();
    await expect(page.getByText("01/07/2026")).toBeVisible();

    // Aller au calendrier en juillet 2026
    await page.goto("/admin/calendrier?year=2026&month=6");
    await page.waitForLoadState("networkidle");

    // La légende doit afficher "Bloqué"
    await expect(page.getByText("Bloqué")).toBeVisible();

    // Le ✕ doit être visible (au moins un)
    await expect(page.locator("[title='Bloqué']").first()).toBeVisible();

    // Cleanup
    await page.goto("/admin/regles");
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Supprimer" }).first().click();
  });

});
