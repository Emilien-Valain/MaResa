import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Auth > Connexion admin
 * Référence Obsidian : Phase 1.4 — Auth avec Better Auth
 *
 * Stratégie : happy path + cas limites + sécurité.
 * Objectif : s'assurer qu'aucune régression n'expose des données ou ne casse l'auth.
 */

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@test.maresa";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "password";

// ─── Happy path ────────────────────────────────────────────────────────────────

test.describe("Auth — Connexion admin", () => {
  test("connexion avec identifiants valides redirige vers /admin", async ({ page }) => {
    await page.goto("/login");
    await page.fill('[name="email"]', ADMIN_EMAIL);
    await page.fill('[name="password"]', ADMIN_PASSWORD);
    await page.click('[type="submit"]');
    await expect(page).toHaveURL(/\/admin/);
  });

  test("identifiants invalides affichent un message d'erreur", async ({ page }) => {
    await page.goto("/login");
    await page.fill('[name="email"]', "wrong@test.fr");
    await page.fill('[name="password"]', "wrongpassword");
    await page.click('[type="submit"]');
    await expect(page.locator('p[role="alert"]')).toBeVisible();
    // On reste sur /login
    await expect(page).toHaveURL(/\/login/);
  });

  test("accès /admin sans session redirige vers /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  // ─── Cas limites ────────────────────────────────────────────────────────────

  test("email valide mais mauvais mot de passe → erreur", async ({ page }) => {
    await page.goto("/login");
    await page.fill('[name="email"]', ADMIN_EMAIL);
    await page.fill('[name="password"]', "mauvais-mot-de-passe-123");
    await page.click('[type="submit"]');
    await expect(page.locator('p[role="alert"]')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("email inexistant → erreur (pas de fuite d'info utilisateur)", async ({ page }) => {
    await page.goto("/login");
    await page.fill('[name="email"]', "inexistant@exemple.com");
    await page.fill('[name="password"]', ADMIN_PASSWORD);
    await page.click('[type="submit"]');
    // Doit afficher la même erreur générique — ne pas révéler si l'email existe
    await expect(page.locator('p[role="alert"]')).toBeVisible();
    const alertText = await page.locator('p[role="alert"]').textContent();
    expect(alertText).not.toMatch(/email.*introuvable|utilisateur.*existe.*pas/i);
  });

  test("mot de passe vide — formulaire bloqué par validation HTML (required)", async ({ page }) => {
    await page.goto("/login");
    await page.fill('[name="email"]', ADMIN_EMAIL);
    // Ne pas remplir le mot de passe
    // On clique submit — le navigateur doit bloquer (required)
    await page.click('[type="submit"]');
    // Toujours sur /login, aucune erreur serveur
    await expect(page).toHaveURL(/\/login/);
    // L'erreur applicative (p[role=alert]) ne doit pas apparaître — le navigateur bloque avant
    // Note : Next.js injecte un <div role="alert" id="__next-route-announcer__"> ignoré ici
    await expect(page.locator('p[role="alert"]')).not.toBeVisible();
  });

  test("mot de passe très long (500 chars) ne provoque pas de crash serveur", async ({ page }) => {
    await page.goto("/login");
    await page.fill('[name="email"]', ADMIN_EMAIL);
    await page.fill('[name="password"]', "x".repeat(500));
    await page.click('[type="submit"]');
    // Doit afficher l'erreur normalement, jamais une page 500
    await expect(page.locator('p[role="alert"]')).toBeVisible();
    await expect(page).not.toHaveURL(/\/admin/);
  });

  // ─── Sécurité ───────────────────────────────────────────────────────────────

  test("XSS dans le champ mot de passe — aucun script ne s'exécute", async ({ page }) => {
    let xssFired = false;
    page.on("dialog", async (dialog) => {
      xssFired = true;
      await dialog.dismiss();
    });

    await page.goto("/login");
    await page.fill('[name="email"]', "xss@test.fr");
    await page.fill('[name="password"]', "<script>alert('xss')</script>");
    await page.click('[type="submit"]');

    // Attendre la réponse du serveur (erreur attendue)
    await expect(page.locator('p[role="alert"]')).toBeVisible();
    expect(xssFired).toBe(false);
  });

  test("accès /admin/chambres sans session → /login (pas juste /admin)", async ({ page }) => {
    await page.goto("/admin/chambres");
    await expect(page).toHaveURL(/\/login/);
  });

  test("accès /admin/reservations sans session → /login", async ({ page }) => {
    await page.goto("/admin/reservations");
    await expect(page).toHaveURL(/\/login/);
  });

  test("accès /admin/calendrier sans session → /login", async ({ page }) => {
    await page.goto("/admin/calendrier");
    await expect(page).toHaveURL(/\/login/);
  });

  test("accès /admin/reservations/[uuid] sans session → /login, pas de 500", async ({ page }) => {
    const response = await page.goto(
      "/admin/reservations/00000000-0000-0000-0000-000000000000",
    );
    await expect(page).toHaveURL(/\/login/);
    // Le layout a redirigé — pas de crash serveur
    expect(response?.status()).not.toBe(500);
  });

  // ─── Déconnexion ────────────────────────────────────────────────────────────

  test("après déconnexion, /admin redirige vers /login", async ({ page }) => {
    // Se connecter d'abord
    await page.goto("/login");
    await page.fill('[name="email"]', ADMIN_EMAIL);
    await page.fill('[name="password"]', ADMIN_PASSWORD);
    await page.click('[type="submit"]');
    await expect(page).toHaveURL(/\/admin/);

    // Se déconnecter
    await page.getByRole("button", { name: "Déconnexion" }).click();
    await expect(page).toHaveURL(/\/login/);

    // Tenter d'accéder à /admin directement
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});
