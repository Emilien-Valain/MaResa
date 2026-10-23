import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { deleteBookingsByEmail } from "../helpers/intake";
import { submitManualBookingForm, SAVED_BOOKING_URL } from "../helpers/confirm";

/**
 * Spécification : Tests de non-régression > Admin > Mise en page mobile
 *
 * L'admin doit rester utilisable sur téléphone (hôte qui consulte ses arrivées) :
 * barre du haut au-dessus du contenu (pas en colonne), tiroir de navigation
 * toujours déplié, fermable au clavier et hors du tab order une fois fermé,
 * liste des réservations en cartes sans débordement horizontal.
 */

const PHONE = { width: 390, height: 844 };
const EMAIL = "mobile-layout@example.com";
const RUN_ID = Date.now().toString(36).slice(-5);
// 120 caractères : le nom doit passer à la ligne, jamais déborder de la carte.
const LONG_NAME = `Mobile ${RUN_ID} ` + "Delacroix-Montgolfier ".repeat(5);

const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as { tenantId: string };

function addDays(n: number) {
  return new Date(Date.now() + n * 86400000).toISOString().split("T")[0];
}

async function mainOverflowX(page: Page) {
  return page.locator("main").evaluate((m) => m.scrollWidth - m.clientWidth);
}

test.describe("Admin — Mise en page mobile", () => {
  test.use({ viewport: PHONE });

  test.beforeAll(() => deleteBookingsByEmail(ctx.tenantId, EMAIL));
  test.afterAll(() => deleteBookingsByEmail(ctx.tenantId, EMAIL));

  test("la barre du haut est au-dessus du contenu, qui prend toute la largeur", async ({ page }) => {
    await page.goto("/admin/reservations");
    const menu = page.getByRole("button", { name: "Ouvrir le menu" });
    const heading = page.getByRole("heading", { name: /réservations/i });
    await expect(menu).toBeVisible();
    const m = (await menu.boundingBox())!;
    const h = (await heading.boundingBox())!;
    expect(h.y).toBeGreaterThan(m.y + m.height - 1);
    // Avant correctif, la barre mobile devenait une colonne de ~155px à gauche.
    expect(h.x).toBeLessThan(40);
    const mainBox = (await page.locator("main").boundingBox())!;
    expect(mainBox.width).toBeGreaterThan(PHONE.width - 1);
    // Cible tactile ≥ 44px
    expect(m.width).toBeGreaterThanOrEqual(44);
    expect(m.height).toBeGreaterThanOrEqual(44);
  });

  test("aucune page admin ne déborde horizontalement sur téléphone", async ({ page }) => {
    for (const url of [
      "/admin",
      "/admin/reservations",
      "/admin/reservations/new",
      "/admin/calendrier",
      "/admin/chambres",
      "/admin/regles",
      "/admin/parametres",
    ]) {
      await page.goto(url);
      await expect(page.getByRole("heading").first()).toBeVisible();
      expect(await mainOverflowX(page), url).toBeLessThanOrEqual(0);
    }
  });

  test("tiroir : ouvre, navigue, se ferme avec Échap et sort du tab order", async ({ page }) => {
    await page.goto("/admin");
    const drawer = page.locator("#admin-drawer");
    const menu = page.getByRole("button", { name: "Ouvrir le menu" });
    await expect(drawer).toHaveAttribute("inert", "");
    // Fermé, le tiroir n'est pas annoncé comme une boîte de dialogue.
    await expect(page.getByRole("dialog", { name: "Navigation" })).toHaveCount(0);

    await menu.click();
    await expect(drawer).not.toHaveAttribute("inert", "");
    await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Réservations" })).toBeVisible();
    // Le focus entre dans le tiroir…
    await expect(drawer.getByRole("link", { name: "Tableau de bord" })).toBeFocused();
    // … et y reste : Tab (et Maj+Tab) bouclent sans passer sous l'overlay.
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Shift+Tab");
      expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(drawer).toHaveAttribute("inert", "");
    // … et revient au bouton menu à la fermeture (pas sur <body>).
    await expect(menu).toBeFocused();

    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await drawer.getByRole("link", { name: "Calendrier" }).click();
    await expect(page).toHaveURL("/admin/calendrier");
    await expect(drawer).toHaveAttribute("inert", "");
  });

  test("tiroir toujours déplié même si la navigation desktop est repliée", async ({ page, context, baseURL }) => {
    // La préférence est un cookie lu par le layout serveur (contexte isolé : rien à nettoyer).
    await context.addCookies([{ name: "admin-sidebar-collapsed", value: "1", url: `${baseURL}/admin` }]);
    await page.goto("/admin");
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    const drawer = page.locator("#admin-drawer");
    await expect(drawer.getByText("Réservations", { exact: true })).toBeVisible();
  });

  test("réservations en cartes : nom long lisible, carte cliquable vers le détail", async ({ page }) => {
    // Fixture créée au viewport téléphone : le formulaire doit aussi y être utilisable.
    await page.goto("/admin/reservations/new");
    const select = page.locator('select[name="roomId"]');
    if ((await select.locator("option").count()) <= 1) { test.skip(); return; }
    await select.selectOption({ index: 1 });
    await page.fill('[name="guestName"]', LONG_NAME);
    await page.fill('[name="guestEmail"]', EMAIL);
    await page.fill('[name="guestCount"]', "2");
    await page.locator('[name="checkIn"]').fill(addDays(400));
    await page.locator('[name="checkOut"]').fill(addDays(402));
    await submitManualBookingForm(page, true);
    await expect(page).toHaveURL(SAVED_BOOKING_URL);
    expect(await mainOverflowX(page)).toBeLessThanOrEqual(0); // détail avec nom long
    await page.goto("/admin/reservations");

    expect(await mainOverflowX(page)).toBeLessThanOrEqual(0);
    // L'en-tête de tableau est masqué : on lit des cartes, pas un tableau tronqué.
    await expect(page.getByRole("columnheader", { name: "Client" })).toBeHidden();

    const name = page.getByText(LONG_NAME.trim());
    await expect(name).toBeVisible();
    const card = (await page.locator("tbody tr").filter({ hasText: RUN_ID }).boundingBox())!;
    const text = (await name.boundingBox())!;
    expect(text.x + text.width).toBeLessThanOrEqual(card.x + card.width + 1);

    await name.click();
    await expect(page).toHaveURL(/\/admin\/reservations\/[0-9a-f-]{36}$/);
  });
});

test.describe("Admin — Bureau : navigation repliée", () => {
  test("repliée, elle le reste après rechargement, sans erreur d'hydratation", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

    await page.goto("/admin");
    const aside = page.locator("aside:visible").first();
    const wide = (await aside.boundingBox())!.width;
    await page.getByRole("button", { name: "Replier la navigation" }).click();
    await expect.poll(async () => (await aside.boundingBox())!.width).toBeLessThan(wide);

    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect((await aside.boundingBox())!.width).toBeLessThan(wide);
    expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([]);
    await expect(page.getByRole("button", { name: "Déplier la navigation" })).toBeVisible();
  });
});

test.describe("Admin — Bureau : la liste reste un tableau", () => {
  test("en-têtes de colonnes visibles à 1280px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/admin/reservations");
    const rows = await page.locator("tbody tr").count();
    if (rows === 0) { test.skip(); return; }
    await expect(page.getByRole("columnheader", { name: "Client" })).toBeVisible();
  });
});
