import { test, expect, type Page } from "@playwright/test";
import path from "path";

/**
 * Spécification : Tests de non-régression > Admin > Accessibilité
 *
 * axe-core (WCAG 2.1 A/AA, contraste inclus) sur chaque page admin et chaque onglet,
 * plus les parcours clavier que axe ne voit pas : lien d'évitement, onglets aux flèches,
 * libellés de champs réellement associés.
 */

const AXE_PATH = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");

type AxeViolation = { id: string; impact: string; nodes: { target: string[] }[] };

async function axeViolations(page: Page) {
  // Pendant une navigation douce (?tab=), Next retire brièvement le <title> : on attend qu'il revienne.
  await expect(page).toHaveTitle(/\S/);
  await page.addScriptTag({ path: AXE_PATH });
  const violations = await page.evaluate(async () => {
    // @ts-expect-error axe est injecté dans la page
    const r = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return r.violations as AxeViolation[];
  });
  return violations.map((v) => `${v.id} (${v.impact}) → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test.describe("Admin — Accessibilité", () => {
  for (const url of [
    "/admin",
    "/admin/reservations",
    "/admin/reservations/new",
    "/admin/calendrier",
    "/admin/chambres",
    "/admin/chambres/new",
    "/admin/does-not-exist",
  ]) {
    test(`axe : aucune violation WCAG AA sur ${url}`, async ({ page }) => {
      await page.goto(url);
      await expect(page.getByRole("heading").first()).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);
    });
  }

  for (const [url, tabs] of [
    ["/admin/regles", ["Règles de réservation", "Tarification", "Blocages manuels"]],
    ["/admin/parametres", ["Général", "Apparence", "Contenu", "Localisation", "Emails", "iCal", "Paiements"]],
  ] as const) {
    test(`axe : aucune violation WCAG AA sur chaque onglet de ${url}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto(url);
      for (const name of tabs) {
        await page.getByRole("tab", { name }).click();
        await expect(page.getByRole("tabpanel", { name })).toBeVisible();
        expect(await axeViolations(page), name).toEqual([]);
      }
    });
  }

  test("texte lisible : rien sous 12px, placeholders au gris contrasté", async ({ page }) => {
    for (const url of ["/admin", "/admin/reservations", "/admin/regles", "/admin/parametres"]) {
      await page.goto(url);
      await expect(page.getByRole("heading").first()).toBeVisible();
      const tiny = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("[data-admin] *")]
          .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
          .filter((el) => el.offsetParent !== null && parseFloat(getComputedStyle(el).fontSize) < 12)
          .map((el) => `${el.tagName}: ${el.textContent!.trim().slice(0, 30)}`),
      );
      expect(tiny, url).toEqual([]);
    }
    await page.goto("/admin/parametres");
    const placeholder = await page
      .locator("#admin-main input[placeholder]")
      .first()
      .evaluate((el) => getComputedStyle(el, "::placeholder").color);
    // --admin-text-subtle #736C66 (≥ 4.5:1), pas le gris clair par défaut du navigateur.
    expect(placeholder).toBe("rgb(115, 108, 102)");
  });

  test("lien d'évitement : premier arrêt clavier, envoie le focus au contenu", async ({ page }) => {
    await page.goto("/admin/reservations");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Aller au contenu" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("#admin-main")).toBeFocused();
  });

  test("onglets : flèches, Début/Fin, un seul arrêt Tab dans la liste", async ({ page }) => {
    await page.goto("/admin/regles");
    const first = page.getByRole("tab", { name: "Règles de réservation" });
    await expect(first).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tab", { name: "Tarification" })).toHaveAttribute("tabindex", "-1");

    await first.focus();
    await page.keyboard.press("ArrowRight");
    const pricing = page.getByRole("tab", { name: "Tarification" });
    await expect(pricing).toBeFocused();
    await expect(pricing).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name: "Tarification" })).toBeVisible();

    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: "Blocages manuels" })).toBeFocused();
    // Bouclage : → depuis le dernier revient au premier
    await page.keyboard.press("ArrowRight");
    await expect(first).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("tab", { name: "Blocages manuels" })).toBeFocused();
    await page.keyboard.press("Home");
    await expect(first).toHaveAttribute("aria-selected", "true");
  });

  test("champs : le libellé est associé au contrôle, l'aide est annoncée", async ({ page }) => {
    await page.goto("/admin/reservations/new");
    await expect(page.getByLabel(/Email client/)).toHaveAttribute("name", "guestEmail");
    await expect(page.getByLabel(/^Chambre/)).toHaveAttribute("name", "roomId");

    await page.goto("/admin/regles");
    await page.getByRole("button", { name: "Ajouter" }).click();
    // Groupe de jours (pas un contrôle unique) : nommé par le libellé, décrit par l'aide.
    const days = page.getByRole("group", { name: "Jours d'arrivée autorisés" });
    await expect(days).toHaveAccessibleDescription("Aucun sélectionné = tous les jours autorisés");
    const firstDay = days.getByRole("button").first();
    await expect(firstDay).toHaveAttribute("aria-pressed", "false");
    await firstDay.click();
    await expect(firstDay).toHaveAttribute("aria-pressed", "true");
  });
});
