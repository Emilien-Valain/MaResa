import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Public > Parcours de réservation
 * Référence Obsidian : Phase 4.2 + 4.3 — Pages publiques et moteur de réservation
 */

function loadTestContext() {
  const contextPath = path.join(process.cwd(), "e2e", ".auth", "test-context.json");
  return JSON.parse(fs.readFileSync(contextPath, "utf-8")) as {
    tenantId: string;
    apiRoomId: string;
    bookedCheckIn: string;
    bookedCheckOut: string;
  };
}

// Dates réservées pour le test de soumission du formulaire
const BOOKING_TEST_CHECKIN = "2026-07-20";
const BOOKING_TEST_CHECKOUT = "2026-07-24";

test.describe("Public — Parcours de réservation", () => {
  test("page d'accueil affiche les informations de l'hôtel", async ({ page }) => {
    await page.goto("/");
    // Un heading visible doit être présent (nom du tenant ou heroTitle)
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    // Un lien vers /chambres doit être présent
    const chambresLink = page.getByRole("link", { name: /chambres/i }).first();
    await expect(chambresLink).toBeVisible();
  });

  test("liste des chambres affiche les chambres actives avec prix", async ({ page }) => {
    await page.goto("/chambres");
    // La chambre de test doit apparaître
    await expect(page.getByText("Chambre API Test")).toBeVisible();
    // Le prix (100) doit être visible quelque part
    await expect(page.getByText(/100/).first()).toBeVisible();
  });

  test("détail d'une chambre affiche le bouton de réservation", async ({ page }) => {
    await page.goto("/chambres/chambre-api-test");
    // Le heading de la chambre doit être visible
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Chambre API Test");
    // Un lien/bouton "Réserver" doit être présent
    const reserverBtn = page.getByRole("link", { name: /réserver/i }).first();
    await expect(reserverBtn).toBeVisible();
  });

  test("le formulaire de réservation affiche le nom de la chambre", async ({ page }) => {
    const { apiRoomId } = loadTestContext();
    await page.goto(`/reserver/${apiRoomId}`);
    // Le nom de la chambre doit être visible dans le titre
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Chambre API Test");
  });

  test("disponibilité indisponible pour les dates bloquées", async ({ page }) => {
    const { apiRoomId, bookedCheckIn, bookedCheckOut } = loadTestContext();
    await page.goto(`/reserver/${apiRoomId}`);

    await page.fill('[name="checkIn"]', bookedCheckIn);
    await page.fill('[name="checkOut"]', bookedCheckOut);

    await expect(page.getByText("Non disponible pour ces dates")).toBeVisible({ timeout: 5000 });
  });

  test("disponibilité disponible pour des dates libres", async ({ page }) => {
    const { apiRoomId } = loadTestContext();
    await page.goto(`/reserver/${apiRoomId}`);

    await page.fill('[name="checkIn"]', "2026-07-01");
    await page.fill('[name="checkOut"]', "2026-07-05");

    await expect(page.getByText("Disponible")).toBeVisible({ timeout: 5000 });
  });

  test("formulaire complet crée un booking pending et redirige vers Stripe", async ({ page }) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
    test.skip(!stripeKey || stripeKey.includes("XXXX"), "STRIPE_SECRET_KEY non configurée — skip");

    const { apiRoomId } = loadTestContext();

    // Nettoyer toute réservation existante pour ces dates de test
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    await pool.query(
      "DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE room_id = $1 AND check_in = $2 AND check_out = $3)",
      [apiRoomId, BOOKING_TEST_CHECKIN + " 00:00:00", BOOKING_TEST_CHECKOUT + " 00:00:00"],
    );
    await pool.query(
      "DELETE FROM bookings WHERE room_id = $1 AND check_in = $2 AND check_out = $3",
      [apiRoomId, BOOKING_TEST_CHECKIN + " 00:00:00", BOOKING_TEST_CHECKOUT + " 00:00:00"],
    );
    await pool.end();

    await page.goto(`/reserver/${apiRoomId}`);

    // Remplir d'abord les informations client
    await page.fill('[name="guestName"]', "Jean Dupont");
    await page.fill('[name="guestEmail"]', "jean.dupont@example.com");
    await page.fill('[name="guestPhone"]', "0601020304");

    // Remplir les dates (libres — nettoyées ci-dessus)
    await page.fill('[name="checkIn"]', BOOKING_TEST_CHECKIN);
    await page.fill('[name="checkOut"]', BOOKING_TEST_CHECKOUT);

    // Attendre la confirmation de disponibilité
    await expect(page.getByText("Disponible")).toBeVisible({ timeout: 8000 });
    // Le bouton doit indiquer "Procéder au paiement"
    await expect(page.locator('[type="submit"]')).toBeEnabled({ timeout: 5000 });
    await expect(page.locator('[type="submit"]')).toContainText("Procéder au paiement");

    // Soumettre — redirige vers Stripe Checkout
    await page.click('[type="submit"]');

    // Vérifier la redirection vers Stripe Checkout
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 15000 });
  });

  test("domaine inconnu retourne une 404 propre", async ({ page }) => {
    const response = await page.request.get("/", {
      headers: { host: "domaine-inconnu-xyz.fr" },
    });
    expect(response.status()).toBe(404);
  });

  test.skip("isolation multi-tenant (seed.ts pas prêt)", async () => {
    // TODO: implémenter quand le seed multi-tenant sera disponible
  });
});
