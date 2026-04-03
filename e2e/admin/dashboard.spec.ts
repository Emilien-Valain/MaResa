import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Admin > Dashboard
 * Référence Obsidian : Phase 2 — Admin (dashboard refonte)
 */

test.describe("Admin — Dashboard", () => {
  // ─── Happy path ────────────────────────────────────────────────────────────

  test("le dashboard affiche le titre et les KPIs", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    // Les 4 KPIs doivent être visibles
    await expect(page.getByText("Occupation aujourd'hui")).toBeVisible();
    await expect(page.getByText("CA aujourd'hui")).toBeVisible();
    await expect(page.getByText("CA cette semaine")).toBeVisible();
    await expect(page.getByText("CA ce mois")).toBeVisible();
  });

  test("le dashboard affiche les sections arrivées et départs", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("Prochaines arrivées")).toBeVisible();
    await expect(page.getByText("Prochains départs")).toBeVisible();
  });

  test("le dashboard affiche la section répartition par canal", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("Réservations par canal")).toBeVisible();
  });

  test("les raccourcis vers Chambres, Nouvelle réservation et Calendrier sont présents", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: /chambres/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /nouvelle réservation/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /calendrier/i }).first()).toBeVisible();
  });

  test("le taux d'occupation affiche un pourcentage valide", async ({ page }) => {
    await page.goto("/admin");
    // Le taux doit être un nombre suivi de %
    const occupancyText = page.locator("text=/\\d+%/").first();
    await expect(occupancyText).toBeVisible();
  });

  // Note : l'accès non authentifié à /admin est testé dans e2e/auth/login.spec.ts
});
