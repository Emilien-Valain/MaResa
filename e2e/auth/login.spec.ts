import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Auth > Connexion admin
 * Référence Obsidian : Phase 1.4 — Auth avec Better Auth
 */

test.describe("Auth — Connexion admin", () => {
  test("connexion avec identifiants valides redirige vers /admin", async ({ page }) => {
    await page.goto("/login");
    await page.fill('[name="email"]', process.env.TEST_ADMIN_EMAIL ?? "admin@test.fr");
    await page.fill('[name="password"]', process.env.TEST_ADMIN_PASSWORD ?? "password");
    await page.click('[type="submit"]');
    await expect(page).toHaveURL(/\/admin/);
  });

  test("identifiants invalides affichent un message d'erreur", async ({ page }) => {
    await page.goto("/login");
    await page.fill('[name="email"]', "wrong@test.fr");
    await page.fill('[name="password"]', "wrongpassword");
    await page.click('[type="submit"]');
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("accès /admin sans session redirige vers /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});
