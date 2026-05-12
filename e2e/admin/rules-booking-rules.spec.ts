import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

// Charger le contexte de test seedé par globalSetup
const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as { tenantId: string; apiRoomId: string };

test.describe("Admin — Règles de séjour", () => {
  // ─── Happy path ────────────────────────────────────────────────────────────

  test("onglet Règles de séjour affiche le formulaire", async ({ page }) => {
    await page.goto("/admin/regles");
    await page.getByRole("button", { name: "Règles de réservation" }).click();
    await expect(page.getByRole("heading", { name: "Règles de séjour" })).toBeVisible();
    await expect(page.getByText("Durée min/max")).toBeVisible();
  });

  test("créer une règle globale min 2 nuits puis la supprimer", async ({ page }) => {
    await page.goto("/admin/regles");
    await page.getByRole("button", { name: "Règles de réservation" }).click();

    await page.getByRole("button", { name: "Ajouter" }).click();

    await page.locator("input[name='minStay']").fill("2");

    await page.getByRole("button", { name: "Créer la règle" }).click();

    await expect(page.getByText("Min 2 nuit(s)")).toBeVisible();
    await expect(page.getByText("Global (toutes les chambres)")).toBeVisible();

    // Cleanup
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Supprimer" }).first().click();
    await expect(page.getByText("Aucune règle configurée")).toBeVisible();
  });

  test("créer une règle avec jours d'arrivée (samedi)", async ({ page }) => {
    await page.goto("/admin/regles");
    await page.getByRole("button", { name: "Règles de réservation" }).click();

    await page.getByRole("button", { name: "Ajouter" }).click();

    // Sélectionner samedi comme jour d'arrivée
    await page.getByRole("button", { name: "Sam" }).first().click();

    await page.getByRole("button", { name: "Créer la règle" }).click();

    await expect(page.getByText(/samedi/)).toBeVisible();

    // Cleanup
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Supprimer" }).first().click();
  });

  test("créer une règle saisonnière", async ({ page }) => {
    await page.goto("/admin/regles");
    await page.getByRole("button", { name: "Règles de réservation" }).click();

    await page.getByRole("button", { name: "Ajouter" }).click();

    await page.locator("input[name='validFrom']").fill("2026-07-01");
    await page.locator("input[name='validTo']").fill("2026-08-31");
    await page.locator("input[name='minStay']").fill("7");

    await page.getByRole("button", { name: "Créer la règle" }).click();

    await expect(page.getByText("Saisonnier")).toBeVisible();
    await expect(page.getByText("Min 7 nuit(s)")).toBeVisible();

    // Cleanup
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Supprimer" }).first().click();
  });

  // ─── Validation API ────────────────────────────────────────────────────────

  test("l'API availability retourne les violations de règles", async ({ page }) => {
    // D'abord créer une règle min 3 nuits
    await page.goto("/admin/regles");
    await page.getByRole("button", { name: "Règles de réservation" }).click();
    await page.getByRole("button", { name: "Ajouter" }).click();
    await page.locator("input[name='minStay']").fill("3");
    await page.getByRole("button", { name: "Créer la règle" }).click();
    await expect(page.getByText("Min 3 nuit(s)")).toBeVisible();

    // Tester l'API avec 1 nuit (doit échouer la validation)
    const response = await page.request.get("/api/availability", {
      params: {
        roomId: ctx.apiRoomId,
        from: "2026-09-01",
        to: "2026-09-02", // 1 nuit
        tenantId: ctx.tenantId,
      },
    });
    const data = await response.json();
    expect(data).toHaveProperty("violations");

    // Cleanup
    await page.goto("/admin/regles");
    await page.getByRole("button", { name: "Règles de réservation" }).click();
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Supprimer" }).first().click();
  });

  // ─── Boundary ──────────────────────────────────────────────────────────────

  test("règle max stay accepte les valeurs valides", async ({ page }) => {
    await page.goto("/admin/regles");
    await page.getByRole("button", { name: "Règles de réservation" }).click();
    await page.getByRole("button", { name: "Ajouter" }).click();

    await page.locator("input[name='maxStay']").fill("14");
    await page.getByRole("button", { name: "Créer la règle" }).click();

    await expect(page.getByText("Max 14 nuit(s)")).toBeVisible();

    // Cleanup
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Supprimer" }).first().click();
  });

  // ─── Fiche chambre ────────────────────────────────────────────────────────

  test("la fiche chambre affiche les règles spécifiques", async ({ page }) => {
    await page.goto("/admin/chambres");
    // Cliquer sur le premier lien "Modifier"
    await page.getByRole("link", { name: "Modifier" }).first().click();
    await expect(page.getByText("Règles spécifiques")).toBeVisible();
    await expect(page.getByRole("link", { name: /Gérer toutes les règles/ })).toBeVisible();
  });
});
