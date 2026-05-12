import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Admin > Paramètres emails
 * Référence Obsidian : Phase 9.3 — Message personnalisé de confirmation
 *
 * Stratégie : happy path + cas limites + sécurité.
 * Prérequis : un admin connecté avec accès à /admin/parametres.
 */

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@test.maresa";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "password";

async function loginAsAdmin(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.goto("/login");
  await page.fill('[name="email"]', ADMIN_EMAIL);
  await page.fill('[name="password"]', ADMIN_PASSWORD);
  await page.click('[type="submit"]');
  await page.waitForURL(/\/admin/);
}

// ─── Happy path ────────────────────────────────────────────────────────────────

test.describe("Admin — Paramètres emails", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("la section Emails est visible dans /admin/parametres", async ({ page }) => {
    await page.goto("/admin/parametres?tab=email");
    await expect(page.getByRole("heading", { name: "Emails", level: 2 })).toBeVisible();
    await expect(page.locator("#email-confirmation")).toBeVisible();
    await expect(page.locator("#email-poststay")).toBeVisible();
    await expect(page.locator("#email-review-url")).toBeVisible();
  });

  test("sauvegarder un message de confirmation fonctionne", async ({ page }) => {
    await page.goto("/admin/parametres?tab=email");

    const textarea = page.locator("#email-confirmation");
    await textarea.fill("Bienvenue ! Nous avons hâte de vous accueillir.");

    // Trouver le bouton Enregistrer dans la section Emails
    const section = page.locator("section", { has: page.locator("#email-confirmation") });
    await section.locator('button[type="submit"]').click();

    await expect(page.getByText("mis à jour avec succès")).toBeVisible({ timeout: 10000 });

    // Recharger la page et vérifier la persistance
    await page.reload();
    await expect(page.locator("#email-confirmation")).toHaveValue(/Bienvenue/);
  });

  test("sauvegarder un message post-séjour fonctionne", async ({ page }) => {
    await page.goto("/admin/parametres?tab=email");

    const textarea = page.locator("#email-poststay");
    await textarea.fill("Merci pour votre séjour !");

    const section = page.locator("section", { has: page.locator("#email-poststay") });
    await section.locator('button[type="submit"]').click();

    await expect(page.getByText("mis à jour avec succès")).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.locator("#email-poststay")).toHaveValue(/Merci/);
  });

  test("sauvegarder une URL de review fonctionne", async ({ page }) => {
    await page.goto("/admin/parametres?tab=email");

    const input = page.locator("#email-review-url");
    await input.fill("https://g.page/r/mon-hotel/review");

    const section = page.locator("section", { has: page.locator("#email-review-url") });
    await section.locator('button[type="submit"]').click();

    await expect(page.getByText("mis à jour avec succès")).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.locator("#email-review-url")).toHaveValue(/g\.page/);
  });

  // ─── Cas limites ────────────────────────────────────────────────────────────

  test("sauvegarder des champs vides réinitialise les valeurs", async ({ page }) => {
    await page.goto("/admin/parametres?tab=email");
    // Attendre la fin de l'hydratation React avant de remplir des champs déjà
    // remplis : sinon Playwright fill() rencontre une race avec le streaming
    // Suspense (un seul caractère est supprimé au lieu du contenu complet).
    await page.waitForLoadState("networkidle");

    await page.locator("#email-confirmation").fill("");
    await page.locator("#email-poststay").fill("");
    await page.locator("#email-review-url").fill("");

    const section = page.locator("section", { has: page.locator("#email-confirmation") });
    await section.locator('button[type="submit"]').click();

    await expect(page.getByText("mis à jour avec succès")).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.locator("#email-confirmation")).toHaveValue("");
    await expect(page.locator("#email-poststay")).toHaveValue("");
    await expect(page.locator("#email-review-url")).toHaveValue("");
  });

  test("un message très long (500 caractères) est accepté", async ({ page }) => {
    await page.goto("/admin/parametres?tab=email");
    await page.waitForLoadState("networkidle");

    const longText = "A".repeat(500);
    await page.locator("#email-confirmation").fill(longText);

    const section = page.locator("section", { has: page.locator("#email-confirmation") });
    await section.locator('button[type="submit"]').click();

    await expect(page.getByText("mis à jour avec succès")).toBeVisible({ timeout: 10000 });
  });

  // ─── Sécurité ──────────────────────────────────────────────────────────────

  test("XSS dans le message de confirmation → le texte est affiché échappé", async ({ page }) => {
    await page.goto("/admin/parametres?tab=email");
    await page.waitForLoadState("networkidle");

    const xss = '<script>alert("XSS")</script>';
    await page.locator("#email-confirmation").fill(xss);

    const section = page.locator("section", { has: page.locator("#email-confirmation") });
    await section.locator('button[type="submit"]').click();

    // Aucun dialog ne doit apparaître
    page.on("dialog", () => {
      throw new Error("Dialog XSS détecté !");
    });

    await expect(page.getByText("mis à jour avec succès")).toBeVisible({ timeout: 10000 });

    // Recharger : le texte doit être stocké tel quel (sera échappé à l'affichage dans l'email)
    await page.reload();
    await expect(page.locator("#email-confirmation")).toHaveValue(xss);
    await page.waitForTimeout(1000);
  });

  test("accès /admin/parametres sans session → redirige vers /login", async ({ browser }) => {
    // Créer un contexte sans storageState (pas de session admin)
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto("/admin/parametres?tab=email");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await context.close();
  });
});
