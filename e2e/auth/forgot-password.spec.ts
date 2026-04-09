import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Auth > Mot de passe oublié
 * Référence Obsidian : Phase 9.2 — Mot de passe oublié
 *
 * Stratégie : happy path + cas limites + sécurité.
 * Note : les tests ne vérifient pas l'envoi réel d'email (pas de boîte SMTP en test).
 * On teste le flow UI et les réponses API.
 */

// ─── Happy path ────────────────────────────────────────────────────────────────

test.describe("Auth — Mot de passe oublié", () => {
  test("la page /forgot-password est accessible", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator("h1")).toContainText("Mot de passe");
    await expect(page.locator('[name="email"]')).toBeVisible();
  });

  test("le lien 'Mot de passe oublié' est présent sur /login", async ({ page }) => {
    await page.goto("/login");
    const link = page.locator('a[href="/forgot-password"]');
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test("soumettre un email affiche le message de succès", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.fill('[name="email"]', "test@example.com");
    await page.click('[type="submit"]');
    // Message de succès toujours affiché (anti-énumération)
    await expect(page.getByText("recevrez un email")).toBeVisible({ timeout: 10000 });
  });

  test("soumettre un email inexistant affiche le même message de succès (anti-énumération)", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.fill('[name="email"]', "inexistant-xyz-12345@example.com");
    await page.click('[type="submit"]');
    await expect(page.getByText("recevrez un email")).toBeVisible({ timeout: 10000 });
  });

  // ─── Reset password page ──────────────────────────────────────────────────

  test("la page /reset-password sans token affiche 'Lien invalide'", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByRole("heading", { name: "Lien invalide" })).toBeVisible();
  });

  test("la page /reset-password avec un token invalide affiche une erreur au submit", async ({ page }) => {
    await page.goto("/reset-password?token=faux-token-12345");
    await page.fill('[name="password"]', "nouveaumotdepasse123");
    await page.fill('[name="confirm"]', "nouveaumotdepasse123");
    await page.click('[type="submit"]');
    await expect(page.locator('p[role="alert"]')).toBeVisible({ timeout: 10000 });
  });

  // ─── Cas limites ────────────────────────────────────────────────────────────

  test("reset password : mots de passe différents → erreur client", async ({ page }) => {
    await page.goto("/reset-password?token=dummy");
    await page.fill('[name="password"]', "motdepasse123");
    await page.fill('[name="confirm"]', "autrechose456");
    await page.click('[type="submit"]');
    await expect(page.locator('p[role="alert"]')).toContainText("correspondent pas");
  });

  test("reset password : mot de passe trop court → formulaire bloqué par validation HTML", async ({ page }) => {
    await page.goto("/reset-password?token=dummy");
    await page.fill('[name="password"]', "court");
    await page.fill('[name="confirm"]', "court");
    await page.click('[type="submit"]');
    // La validation HTML minLength=8 empêche le submit, on reste sur la même page
    await expect(page).toHaveURL(/\/reset-password/);
    // Pas d'erreur JS affichée (le navigateur gère la validation)
  });

  test("forgot-password : email vide → formulaire bloqué par validation HTML", async ({ page }) => {
    await page.goto("/forgot-password");
    const submitBtn = page.locator('[type="submit"]');
    await submitBtn.click();
    // Le formulaire ne soumet pas (validation HTML required)
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  // ─── Sécurité ──────────────────────────────────────────────────────────────

  test("XSS dans le champ email de forgot-password → pas d'exécution de script", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.fill('[name="email"]', '<script>alert(1)</script>@test.com');
    await page.click('[type="submit"]');
    // Pas de dialog JavaScript
    page.on("dialog", () => {
      throw new Error("Dialog XSS détecté !");
    });
    // Attendre un peu pour vérifier qu'aucun dialog n'apparaît
    await page.waitForTimeout(1000);
  });

  test("message de succès login après reset", async ({ page }) => {
    await page.goto("/login?reset=success");
    await expect(page.getByText("réinitialisé")).toBeVisible({ timeout: 10000 });
  });
});
