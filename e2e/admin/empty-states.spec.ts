import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Spécification : Tests de non-régression > Admin > États vides
 *
 * Un hôte qui démarre voit des listes vides : chacune doit dire ce qui apparaîtra,
 * donner un exemple concret et proposer la première action. On se connecte au
 * tenant « empty-tenant » (créé vide par global-setup, l'admin de test y a accès).
 */

const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as { emptyTenantSlug: string };

// Session propre au sous-domaine du tenant vide (les cookies localhost ne s'y appliquent pas) :
// une seule connexion pour tout le fichier, réutilisée par chaque test.
const STATE = path.join(process.cwd(), "e2e", ".auth", "empty-tenant.json");
test.use({ storageState: STATE });

let ORIGIN = "";

test.describe("Admin — États vides", () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    // Premier accès au sous-domaine : compilation de /login à froid, plus lente sous charge.
    test.setTimeout(90_000);
    ORIGIN = baseURL!.replace("localhost", `${ctx.emptyTenantSlug}.localhost`);
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto(`${ORIGIN}/login`);
    await page.fill('[name="email"]', process.env.TEST_ADMIN_EMAIL!);
    await page.fill('[name="password"]', process.env.TEST_ADMIN_PASSWORD!);
    await page.click('[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 30_000 });
    await context.storageState({ path: STATE });
    await context.close();
  });

  test("chambres : explication, exemple et bouton de création", async ({ page }) => {
    await page.goto(`${ORIGIN}/admin/chambres`);
    const empty = page.locator("[data-empty-state]");
    await expect(empty.getByText("Aucune chambre pour l’instant")).toBeVisible();
    await expect(empty.getByText("Exemple :")).toBeVisible();
    await empty.getByRole("link", { name: "Créer ma première chambre" }).click();
    await expect(page).toHaveURL(/\/admin\/chambres\/new$/);
  });

  test("réservations : vide ≠ filtré", async ({ page }) => {
    await page.goto(`${ORIGIN}/admin/reservations`);
    const empty = page.locator("[data-empty-state]");
    await expect(empty.getByText("Aucune réservation pour l’instant")).toBeVisible();
    await expect(empty.getByRole("link", { name: "Saisir une réservation" })).toHaveAttribute(
      "href",
      "/admin/reservations/new",
    );

    await page.goto(`${ORIGIN}/admin/reservations?status=cancelled`);
    await expect(empty.getByText("Aucune réservation ne correspond à ce filtre")).toBeVisible();
    await empty.getByRole("link", { name: "Voir toutes les réservations" }).click();
    await expect(page).toHaveURL(/\/admin\/reservations$/);
  });

  test("calendrier sans chambre active : renvoie vers les chambres", async ({ page }) => {
    await page.goto(`${ORIGIN}/admin/calendrier`);
    const empty = page.locator("[data-empty-state]");
    await expect(empty.getByText("Aucune chambre active")).toBeVisible();
    await empty.getByRole("link", { name: "Voir les chambres" }).click();
    await expect(page).toHaveURL(/\/admin\/chambres$/);
  });

  test("règles : chaque onglet vide explique avec un exemple, « Ajouter » ouvre le formulaire", async ({ page }) => {
    await page.goto(`${ORIGIN}/admin/regles`);
    for (const [tab, title, field] of [
      ["Règles de réservation", "Aucune règle configurée", "minStay"],
      ["Tarification", "Aucune règle tarifaire configurée", "fixedPrice"],
      ["Blocages manuels", "Aucun blocage configuré", "startDate"],
    ] as const) {
      await page.getByRole("tab", { name: tab }).click();
      const empty = page.locator("[data-empty-state]");
      await expect(empty.getByText(title)).toBeVisible();
      await expect(empty.getByText("Exemple :")).toBeVisible();
      // Une seule entrée : le bouton « Ajouter » de l'en-tête, pas de doublon dans l'état vide.
      await expect(empty.getByRole("button")).toHaveCount(0);
      await page.getByRole("button", { name: "Ajouter", exact: true }).click();
      await expect(page.locator(`[name="${field}"]`)).toBeVisible();
      // Formulaire ouvert : l'état vide s'efface (une chose à la fois).
      await expect(page.locator("[data-empty-state]")).toHaveCount(0);
      await page.getByRole("button", { name: "Annuler", exact: true }).first().click();
    }
  });

  test("iCal : explique Airbnb/Booking, « Ajouter » ouvre le formulaire", async ({ page }) => {
    await page.goto(`${ORIGIN}/admin/parametres`);
    await page.getByRole("tab", { name: "iCal" }).click();
    const empty = page.locator("[data-empty-state]");
    await expect(empty.getByText("Aucun calendrier externe configuré")).toBeVisible();
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(page.locator('[name="url"]')).toBeVisible();
    await expect(page.locator("[data-empty-state]")).toHaveCount(0);
  });
});
