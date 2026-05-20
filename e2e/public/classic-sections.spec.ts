import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Public > Sections Classic
 *
 * Source de vérité : `Tests de non-régression.md`
 *
 * Couvre les sections introduites par la refonte « DirectLoc Booking Flow » :
 *   - Chiffres clés (4 cartes, hydratées par config.storyStats)
 *   - Nous trouver (ancre + adresse + téléphone + carte interactive)
 *   - Lien d'ancrage « Nous trouver » dans le header
 *
 * Pré-requis : global-setup hydrate le tenant test avec storyStats,
 * address, phone, email, latitude, longitude.
 */

function loadTestContext() {
  const contextPath = path.join(process.cwd(), "e2e", ".auth", "test-context.json");
  return JSON.parse(fs.readFileSync(contextPath, "utf-8")) as {
    tenantId: string;
    apiRoomId: string;
  };
}

test.describe("Public — Sections Classic (homepage)", () => {
  test("chiffres clés : 4 cartes rendues avec valeur, label et détail", async ({ page }) => {
    await page.goto("/");

    const section = page.locator("#chiffres-cles");
    await expect(section).toBeVisible();

    // Les 4 valeurs configurées dans global-setup doivent apparaître
    for (const value of ["5", "12", "1820", "25 m"]) {
      await expect(section.getByText(value, { exact: true }).first()).toBeVisible();
    }

    // Au moins un label
    await expect(section.getByText("Chambres", { exact: true })).toBeVisible();
    // Au moins un sous-titre (sub)
    await expect(section.getByText(/d'exception/i)).toBeVisible();
  });

  test("nous trouver : ancre, heading et coordonnées du tenant", async ({ page }) => {
    await page.goto("/");

    const section = page.locator("#nous-trouver");
    await expect(section).toBeVisible();

    // Eyebrow + heading
    await expect(section.getByText("Nous trouver", { exact: true })).toBeVisible();

    // Adresse seedée par global-setup
    await expect(section.getByText("Route des Vignes")).toBeVisible();
    await expect(section.getByText(/84480 Bonnieux/)).toBeVisible();

    // Contacts
    await expect(section.getByText("+33 4 90 00 00 00")).toBeVisible();
    await expect(section.getByText("contact@mas-provencal.fr")).toBeVisible();
  });

  test("nous trouver : lien d'ancrage dans le header desktop pointe vers /#nous-trouver", async ({ page }) => {
    // viewport desktop pour voir le nav (le mobile passe par MobileNav)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    const link = page.getByRole("link", { name: "Nous trouver", exact: true }).first();
    await expect(link).toBeVisible();

    const href = await link.getAttribute("href");
    expect(href).toBe("/#nous-trouver");
  });

  test("nous trouver : carte interactive Leaflet chargée quand lat/lng sont configurés", async ({ page }) => {
    await page.goto("/");

    const section = page.locator("#nous-trouver");
    await section.scrollIntoViewIfNeeded();

    // Leaflet injecte un .leaflet-container ; on attend qu'il apparaisse
    // (chargement dynamique côté client)
    await expect(section.locator(".leaflet-container")).toBeVisible({ timeout: 8000 });

    // Les tuiles doivent commencer à charger
    await expect(section.locator(".leaflet-tile-pane")).toBeAttached();

    // Le lien « Ouvrir dans Google Maps » est généré à partir des coordonnées
    const mapsLink = section.getByRole("link", { name: /Google Maps/i });
    await expect(mapsLink).toBeVisible();
    const href = await mapsLink.getAttribute("href");
    expect(href).toMatch(/maps\.google|google\.com\/maps/i);
  });
});

test.describe("Public — Booking summary sidebar (Classic)", () => {
  test.beforeEach(async ({ page }) => {
    // Pré-charge la page de réservation
    const { apiRoomId } = loadTestContext();
    await page.goto(`/reserver/${apiRoomId}`);
    // Attend que les inputs date soient hydratés avant d'interagir
    await page.waitForLoadState("networkidle");
  });

  test("sidebar visible avec photo, nom de chambre et totaux par défaut", async ({ page }) => {
    const summary = page.getByTestId("booking-summary");
    await expect(summary).toBeVisible();
    await expect(summary).toContainText("Chambre API Test");
    await expect(summary).toContainText("Jusqu'à 2 personne");
  });

  test("changement de checkIn met à jour la date Arrivée dans la sidebar", async ({ page }) => {
    await page.fill('[name="checkIn"]', "2026-07-15");
    await page.fill('[name="checkOut"]', "2026-07-18");

    // La sidebar reflète la date saisie (format FR : « 15 juillet »)
    await expect(page.getByTestId("booking-summary-checkin")).toHaveText(/15\s+juillet/);
    await expect(page.getByTestId("booking-summary-checkout")).toHaveText(/18\s+juillet/);
    await expect(page.getByTestId("booking-summary-nights")).toHaveText(/3\s+nuits/);
  });

  test("changement de guestCount met à jour Voyageurs dans la sidebar", async ({ page }) => {
    // Le tenant test a une chambre de capacité 2
    await expect(page.getByTestId("booking-summary-guests")).toHaveText("1 pers.");

    await page.fill('[name="guestCount"]', "2");
    await expect(page.getByTestId("booking-summary-guests")).toHaveText("2 pers.");
  });

  test("total apparaît dans la sidebar quand la disponibilité est confirmée", async ({ page }) => {
    // Dates libres (loin de la réservation de 2026-06-10..15)
    await page.fill('[name="checkIn"]', "2026-08-04");
    await page.fill('[name="checkOut"]', "2026-08-07");

    // Attend la validation de dispo (debounce 500ms + 2 API calls)
    await expect(page.getByText("Disponible")).toBeVisible({ timeout: 8000 });

    // 3 nuits × 100€ = 300€
    const total = page.getByTestId("booking-summary-total");
    await expect(total).not.toHaveText("—", { timeout: 5000 });
    await expect(total).toContainText("300");
  });

  test("total revient à — quand les dates deviennent indisponibles", async ({ page }) => {
    // Première sélection : dates valides
    await page.fill('[name="checkIn"]', "2026-08-10");
    await page.fill('[name="checkOut"]', "2026-08-12");
    await expect(page.getByText("Disponible")).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId("booking-summary-total")).toContainText("200", { timeout: 5000 });

    // Bascule sur des dates bloquées par la réservation existante (2026-06-10..15)
    await page.fill('[name="checkIn"]', "2026-06-11");
    await page.fill('[name="checkOut"]', "2026-06-13");

    await expect(page.getByText("Non disponible pour ces dates")).toBeVisible({ timeout: 8000 });
    // La sidebar ne doit plus afficher un total chiffré
    await expect(page.getByTestId("booking-summary-total")).toHaveText("—", { timeout: 5000 });
  });

  test("bouton submit affiche le montant total quand disponible", async ({ page }) => {
    await page.fill('[name="checkIn"]', "2026-09-01");
    await page.fill('[name="checkOut"]', "2026-09-03");
    await expect(page.getByText("Disponible")).toBeVisible({ timeout: 8000 });

    const submit = page.getByTestId("booking-submit");
    await expect(submit).toBeEnabled();
    // 2 nuits × 100 = 200€, formaté en FR
    await expect(submit).toContainText(/Payer.*200/);
    await expect(submit).toContainText("confirmer");
  });
});
