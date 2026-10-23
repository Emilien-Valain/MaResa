import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { test, expect } from "@playwright/test";
import { confirmDialog } from "../helpers/confirm";

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

  test("adresse du site en langage hôte : pas de « slug » ni de « tenant »", async ({ page }) => {
    await page.goto("/admin/parametres");
    await expect(page.getByRole("heading", { name: "Adresse de votre site" })).toBeVisible();
    await expect(page.getByText("Identifiant à donner au support")).toBeVisible();
    const main = page.locator("#admin-main");
    // L'identifiant affiché est le slug lui-même (« test-tenant ») : on le retire avant de chercher le jargon.
    const text = (await main.innerText()).replaceAll("test-tenant", "");
    expect(text).not.toMatch(/slug|tenant|Contacte-nous/i);
  });

  test("email de contact invalide refusé par le serveur, message lisible (pas de JSON)", async ({ page }) => {
    await page.goto("/admin/parametres");
    const email = page.locator("input[name='email']");
    const before = await email.inputValue();
    await email.evaluate((el) => ((el as HTMLInputElement).form!.noValidate = true));
    await email.fill("pas-un-email");
    await page.getByRole("button", { name: "Enregistrer" }).first().click();

    await expect(page.getByText("Adresse email invalide").first()).toBeVisible();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveValue("pas-un-email");
    await expect(page.getByText('"code"')).toHaveCount(0);
    await expect(page.getByText("Informations mises à jour.")).toHaveCount(0);

    // Rien n'a été enregistré.
    await page.reload();
    await expect(page.locator("input[name='email']")).toHaveValue(before);
  });

  test("la section Stripe est affichée", async ({ page }) => {
    await page.goto("/admin/parametres");
    await page.getByRole("tab", { name: "Paiements" }).click();
    await expect(page.getByText("Paiement Stripe")).toBeVisible();
    await expect(page.getByRole("button", { name: /connecter stripe/i })).toBeVisible();
  });

  test("la section calendriers externes est affichée", async ({ page }) => {
    await page.goto("/admin/parametres");
    await page.getByRole("tab", { name: "iCal" }).click();
    await expect(page.getByText("Calendriers externes")).toBeVisible();
  });

  test("le lien Paramètres est visible dans la navigation admin", async ({ page }) => {
    await page.goto("/admin");
    // Le dashboard contient deux liens vers /admin/parametres : la sidebar (texte exact "Paramètres")
    // et la carte raccourci (texte composé). On cible la sidebar avec exact: true.
    await expect(
      page.getByRole("link", { name: "Paramètres", exact: true }),
    ).toBeVisible();
  });

  // ─── iCal sources CRUD ────────────────────────────────────────────────────

  test("ajout, affichage et suppression d'une source iCal", async ({ page }) => {
    const { apiRoomId, tenantId } = loadTestContext();
    await page.goto("/admin/parametres");
    await page.getByRole("tab", { name: "iCal" }).click();

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

    // Cibler la ligne par data-source-name
    const sourceItem = page.locator(`[data-source-name="Airbnb Test ${RUN_ID}"]`);
    await sourceItem.getByRole("button", { name: "Supprimer" }).click();
    await confirmDialog(page);

    // La ligne doit disparaître (cibler la ligne : le titre du dialog contient aussi le nom)
    await expect(sourceItem).toHaveCount(0, { timeout: 10000 });

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
    await page.getByRole("tab", { name: "iCal" }).click();

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
