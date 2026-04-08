import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

// Charger le contexte de test seedé par globalSetup
const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as { tenantId: string; apiRoomId: string };

test.describe("Admin — Tarification dynamique", () => {
  // ─── Happy path ────────────────────────────────────────────────────────────

  test("onglet Tarification affiche le formulaire", async ({ page }) => {
    await page.goto("/admin/regles");
    await page.getByRole("button", { name: "Tarification" }).click();
    await expect(page.getByRole("heading", { name: "Tarification dynamique" })).toBeVisible();
    await expect(page.getByText("Prix saisonniers")).toBeVisible();
  });

  test("créer une règle de prix fixe puis la supprimer", async ({ page }) => {
    await page.goto("/admin/regles");
    await page.getByRole("button", { name: "Tarification" }).click();

    await page.getByRole("button", { name: "Ajouter" }).click();

    await page.locator("input[name='name']").fill("Haute saison test");
    await page.locator("input[name='validFrom']").fill("2026-06-01");
    await page.locator("input[name='validTo']").fill("2026-08-31");
    await page.locator("input[name='fixedPrice']").fill("150");

    await page.getByRole("button", { name: "Créer la règle" }).click();

    await expect(page.getByText("Haute saison test")).toBeVisible();
    await expect(page.getByText("150 €/nuit")).toBeVisible();

    // Cleanup
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Supprimer" }).first().click();
    await expect(page.getByText("Aucune règle tarifaire configurée")).toBeVisible();
  });

  test("créer une règle avec modificateur pourcentage", async ({ page }) => {
    await page.goto("/admin/regles");
    await page.getByRole("button", { name: "Tarification" }).click();

    await page.getByRole("button", { name: "Ajouter" }).click();

    await page.locator("input[name='name']").fill("Promo hiver");

    // Sélectionner le type pourcentage
    await page.getByLabel("Modificateur (%)").check();

    await page.locator("input[name='percentageModifier']").fill("-15");

    await page.getByRole("button", { name: "Créer la règle" }).click();

    await expect(page.getByText("Promo hiver")).toBeVisible();
    await expect(page.getByText("-15%")).toBeVisible();

    // Cleanup
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Supprimer" }).first().click();
  });

  test("créer une règle par jour de la semaine (samedi)", async ({ page }) => {
    await page.goto("/admin/regles");
    await page.getByRole("button", { name: "Tarification" }).click();

    await page.getByRole("button", { name: "Ajouter" }).click();

    await page.locator("input[name='name']").fill("Samedi soir");

    // Sélectionner samedi
    await page.getByRole("button", { name: "Sam" }).first().click();

    await page.locator("input[name='fixedPrice']").fill("130");

    await page.getByRole("button", { name: "Créer la règle" }).click();

    await expect(page.getByText("Samedi soir")).toBeVisible();
    await expect(page.getByText("130 €/nuit")).toBeVisible();
    await expect(page.getByText(/samedi/)).toBeVisible();

    // Cleanup
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Supprimer" }).first().click();
  });

  // ─── Toggle actif/inactif ─────────────────────────────────────────────────

  test("désactiver et réactiver une règle de pricing", async ({ page }) => {
    await page.goto("/admin/regles");
    await page.getByRole("button", { name: "Tarification" }).click();

    // Créer une règle
    await page.getByRole("button", { name: "Ajouter" }).click();
    await page.locator("input[name='name']").fill("Toggle test");
    await page.locator("input[name='fixedPrice']").fill("200");
    await page.getByRole("button", { name: "Créer la règle" }).click();
    await expect(page.getByText("Toggle test")).toBeVisible();

    // Désactiver
    await page.getByRole("button", { name: "Désactiver" }).first().click();
    await expect(page.getByText("Désactivée")).toBeVisible();

    // Réactiver
    await page.getByRole("button", { name: "Activer" }).first().click();
    await expect(page.getByText("Désactivée")).not.toBeVisible();

    // Cleanup
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Supprimer" }).first().click();
  });

  // ─── API Pricing ───────────────────────────────────────────────────────────

  test("l'API /api/pricing retourne un breakdown valide", async ({ page }) => {
    const response = await page.request.get("/api/pricing", {
      params: {
        roomId: ctx.apiRoomId,
        from: "2026-07-01",
        to: "2026-07-03",
        tenantId: ctx.tenantId,
      },
    });
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty("nights");
    expect(data).toHaveProperty("totalPrice");
    expect(data).toHaveProperty("minPricePerNight");
    expect(data).toHaveProperty("maxPricePerNight");
    expect(Array.isArray(data.nights)).toBe(true);
  });

  test("l'API /api/rules retourne les règles effectives", async ({ page }) => {
    const response = await page.request.get("/api/rules", {
      params: {
        roomId: ctx.apiRoomId,
        tenantId: ctx.tenantId,
      },
    });
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty("minStay");
    expect(data).toHaveProperty("maxStay");
    expect(data).toHaveProperty("allowedCheckInDays");
    expect(data).toHaveProperty("allowedCheckOutDays");
  });

  // ─── Boundary ──────────────────────────────────────────────────────────────

  test("l'API /api/pricing gère les paramètres manquants", async ({ page }) => {
    const response = await page.request.get("/api/pricing");
    expect(response.status()).toBe(400);
  });

  test("l'API /api/pricing gère les dates invalides", async ({ page }) => {
    const response = await page.request.get("/api/pricing", {
      params: {
        roomId: ctx.apiRoomId,
        from: "invalid",
        to: "invalid",
        tenantId: ctx.tenantId,
      },
    });
    expect(response.status()).toBe(400);
  });

  test("l'API /api/pricing gère checkOut <= checkIn", async ({ page }) => {
    const response = await page.request.get("/api/pricing", {
      params: {
        roomId: ctx.apiRoomId,
        from: "2026-07-05",
        to: "2026-07-01",
        tenantId: ctx.tenantId,
      },
    });
    expect(response.status()).toBe(400);
  });

  // ─── Sécurité ──────────────────────────────────────────────────────────────

  test("XSS dans le nom de règle est échappé", async ({ page }) => {
    // Register dialog handler BEFORE any action that might trigger it
    let dialogDetected = false;
    page.on("dialog", async (dialog) => {
      dialogDetected = true;
      await dialog.accept();
    });

    await page.goto("/admin/regles");
    await page.getByRole("button", { name: "Tarification" }).click();
    await page.getByRole("button", { name: "Ajouter" }).click();

    const xssPayload = '<script>alert(1)</script>';
    await page.locator("input[name='name']").fill(xssPayload);
    await page.locator("input[name='fixedPrice']").fill("100");
    await page.getByRole("button", { name: "Créer la règle" }).click();

    // Le texte doit apparaître échappé, pas de dialog XSS
    await expect(page.getByText(xssPayload)).toBeVisible();
    expect(dialogDetected).toBe(false);

    // Cleanup — the dialog handler is already registered above and will accept confirm()
    await page.getByRole("button", { name: "Supprimer" }).first().click();
  });
});
