import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Admin > Paramètres
 * Référence Obsidian : Phase 5.1 (Stripe Connect) + Phase 6 (iCal sources)
 *
 * Note : l'accès non authentifié à /admin/* est testé dans e2e/auth/login.spec.ts
 */

function loadTestContext() {
  const contextPath = path.join(process.cwd(), "e2e", ".auth", "test-context.json");
  return JSON.parse(fs.readFileSync(contextPath, "utf-8")) as {
    tenantId: string;
    apiRoomId: string;
  };
}

const RUN_ID = Date.now().toString(36);

test.describe("Admin — Paramètres", () => {
  // ─── Happy path ────────────────────────────────────────────────────────────

  test("la page paramètres est accessible", async ({ page }) => {
    await page.goto("/admin/parametres");
    await expect(page.getByRole("heading", { level: 1, name: "Paramètres" })).toBeVisible();
  });

  test("la section Stripe est affichée", async ({ page }) => {
    await page.goto("/admin/parametres");
    await expect(page.getByText("Paiement Stripe")).toBeVisible();
    await expect(page.getByRole("button", { name: /connecter stripe/i })).toBeVisible();
  });

  test("la section calendriers externes est affichée", async ({ page }) => {
    await page.goto("/admin/parametres");
    await expect(page.getByText("Calendriers externes")).toBeVisible();
  });

  test("le lien Paramètres est visible dans la navigation admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: "Paramètres" })).toBeVisible();
  });

  // ─── iCal sources CRUD ────────────────────────────────────────────────────

  test("ajout, affichage et suppression d'une source iCal", async ({ page }) => {
    const { apiRoomId, tenantId } = loadTestContext();
    await page.goto("/admin/parametres");

    // Cliquer sur Ajouter
    await page.getByRole("button", { name: "Ajouter" }).click();

    // Remplir le formulaire
    await page.selectOption("#ical-room", apiRoomId);
    await page.fill("#ical-name", `Airbnb Test ${RUN_ID}`);
    await page.fill("#ical-url", `https://www.airbnb.com/calendar/ical/test-${RUN_ID}.ics`);

    await page.getByRole("button", { name: "Ajouter le calendrier" }).click();

    // La source doit apparaître dans la liste
    await expect(page.getByText(`Airbnb Test ${RUN_ID}`)).toBeVisible({ timeout: 5000 });

    // Supprimer la source — intercepter le dialog de confirmation
    page.on("dialog", (dialog) => dialog.accept());

    // Cibler la ligne par data-source-name
    const sourceItem = page.locator(`[data-source-name="Airbnb Test ${RUN_ID}"]`);
    await sourceItem.getByRole("button", { name: "Supprimer" }).click();

    // La source ne doit plus être visible
    await expect(page.getByText(`Airbnb Test ${RUN_ID}`)).not.toBeVisible({ timeout: 5000 });

    // Nettoyage DB au cas où
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    await pool.query(
      "DELETE FROM ical_sources WHERE tenant_id = $1 AND name LIKE $2",
      [tenantId, `%${RUN_ID}%`],
    );
    await pool.end();
  });

  // ─── Sécurité ──────────────────────────────────────────────────────────────

  test("XSS dans le nom de source iCal est échappé", async ({ page }) => {
    const { apiRoomId, tenantId } = loadTestContext();
    await page.goto("/admin/parametres");

    await page.getByRole("button", { name: "Ajouter" }).click();

    const xssPayload = `<script>alert('xss-${RUN_ID}')</script>`;
    const xssUrl = `https://example.com/xss-${RUN_ID}.ics`;
    await page.selectOption("#ical-room", apiRoomId);
    await page.fill("#ical-name", xssPayload);
    await page.fill("#ical-url", xssUrl);

    await page.getByRole("button", { name: "Ajouter le calendrier" }).click();

    // Le texte doit apparaître échappé — pas de dialog JS
    await expect(page.getByText(xssPayload)).toBeVisible({ timeout: 5000 });

    // Nettoyage via DB directement
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    await pool.query(
      "DELETE FROM ical_sources WHERE tenant_id = $1 AND name LIKE $2",
      [tenantId, `%${RUN_ID}%`],
    );
    await pool.end();
  });
});
