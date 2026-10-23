import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { deletePricingRulesByName } from "../helpers/intake";

/**
 * Spécification : Tests de non-régression > Admin > Champs date (JJ/MM/AAAA)
 *
 * Le <input type="date"> natif suit la langue du navigateur (MM/DD/YYYY en anglais).
 * Les champs date de l'admin (`DateInput`) affichent toujours JJ/MM/AAAA, quel que soit
 * le navigateur ; on force ici une locale en-US pour le prouver.
 */

const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as { tenantId: string };

const RULE = `Dates FR ${Date.now().toString(36).slice(-6)}`;

test.use({ locale: "en-US" });

test.describe("Admin — Champs date JJ/MM/AAAA", () => {
  test.afterAll(() => deletePricingRulesByName(ctx.tenantId, RULE));

  test("saisie : barres ajoutées en tapant, date ISO convertie", async ({ page }) => {
    await page.goto("/admin/reservations/new");
    const checkIn = page.getByLabel(/^Arrivée/);
    // Valeur par défaut (aujourd'hui) déjà en JJ/MM/AAAA
    await expect(checkIn).toHaveValue(/^\d{2}\/\d{2}\/\d{4}$/);
    await expect(checkIn).toHaveAttribute("placeholder", "jj/mm/aaaa");

    await checkIn.fill("");
    await checkIn.pressSequentially("05012027");
    await expect(checkIn).toHaveValue("05/01/2027");

    // Barres tapées à la main avec jour/mois sur un chiffre
    await checkIn.fill("");
    await checkIn.pressSequentially("1/5/2027");
    await expect(checkIn).toHaveValue("1/5/2027");

    await checkIn.fill("2027-03-14");
    await expect(checkIn).toHaveValue("14/03/2027");

    await expect(page.getByRole("button", { name: "Ouvrir le calendrier" }).first()).toBeVisible();
  });

  test("règle tarifaire saisie en JJ/MM/AAAA : enregistrée et affichée en JJ/MM/AAAA", async ({ page }) => {
    await page.goto("/admin/regles");
    await page.getByRole("tab", { name: "Tarification" }).click();
    await page.getByRole("button", { name: "Ajouter" }).click();
    await page.locator("input[name='name']").fill(RULE);
    await page.locator("input[name='validFrom']").pressSequentially("05062027");
    await page.locator("input[name='validTo']").fill("31/08/2027");
    await page.locator("input[name='fixedPrice']").fill("140");
    await page.getByRole("button", { name: "Créer la règle" }).click();

    const row = page.locator("div").filter({ hasText: RULE }).filter({ hasText: "140 €/nuit" }).last();
    await expect(row).toContainText("05/06/2027 → 31/08/2027");
  });

  test("date incomplète : le formulaire ne part pas", async ({ page }) => {
    await page.goto("/admin/regles");
    await page.getByRole("tab", { name: "Tarification" }).click();
    await page.getByRole("button", { name: "Ajouter" }).click();
    await page.locator("input[name='name']").fill(`${RULE} incomplète`);
    await page.locator("input[name='validFrom']").fill("12/05");
    await page.locator("input[name='fixedPrice']").fill("99");
    await page.getByRole("button", { name: "Créer la règle" }).click();
    const invalid = await page
      .locator("input[name='validFrom']")
      .evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(invalid).toBe(true);
    await expect(page.getByText(`${RULE} incomplète`)).toHaveCount(0);
  });
});
