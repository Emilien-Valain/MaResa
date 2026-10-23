import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { test, expect } from "@playwright/test";
import { cleanRules } from "../helpers/clean-rules";
import { fd } from "../helpers/dates";

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
    rivalTenantId: string;
    rivalRoomId: string;
  };
}

// Dates réservées pour le test de soumission du formulaire
const BOOKING_TEST_CHECKIN = fd("2026-07-20");
const BOOKING_TEST_CHECKOUT = fd("2026-07-24");

// IP dédiée : budget de rate-limit propre à ce fichier (cf. holds.spec).
test.use({ extraHTTPHeaders: { "x-forwarded-for": "10.10.0.3" } });

test.describe("Public — Parcours de réservation", () => {
  // Nettoyer les rules potentiellement laissées par les tests admin
  test.beforeAll(async () => {
    const ctx = loadTestContext();
    await cleanRules(ctx.tenantId);
  });
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
    // Le H1 du template Classic est « Vos coordonnées » ; le nom de la chambre
    // est affiché en eyebrow au-dessus, dans le fil d'Ariane et dans le sidebar.
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Vos coordonnées");
    await expect(page.getByText("Chambre API Test").first()).toBeVisible();
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

    await page.fill('[name="checkIn"]', fd("2026-07-01"));
    await page.fill('[name="checkOut"]', fd("2026-07-05"));

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
    // Le bouton doit être activé. Le libellé est :
    // - « Procéder au paiement » côté Boutique
    // - « Payer XXX € et confirmer » côté Classic (avec le total dynamique)
    await expect(page.locator('[type="submit"]')).toBeEnabled({ timeout: 5000 });
    await expect(page.locator('[type="submit"]')).toContainText(
      /Procéder au paiement|Payer.*confirmer/,
    );

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

  test("isolation multi-tenant — la chambre du rival n'est pas visible", async ({ page }) => {
    const ctx = loadTestContext();

    // La page /chambres ne doit lister que les chambres du tenant courant
    await page.goto("/chambres");
    // La chambre "Suite Rival" ne doit pas apparaître
    await expect(page.getByText("Suite Rival")).not.toBeVisible();
    // La chambre API Test (du tenant principal) doit être visible
    await expect(page.getByText("Chambre API Test")).toBeVisible();

    // L'API availability avec le roomId rival + le tenantId du tenant principal
    // doit retourner available=true (aucune booking pour ce roomId dans ce tenant)
    const res = await page.request.get("/api/availability", {
      params: {
        roomId: ctx.rivalRoomId,
        from: fd("2026-06-10"),
        to: fd("2026-06-15"),
        tenantId: ctx.tenantId,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    // La réservation du rival ne doit pas bloquer — pas de fuite inter-tenant
    expect(body.available).toBe(true);
  });

  // ─── Refus rendus au formulaire (audit 2026-10/04) ────────────────────────
  // Une erreur levée par la server action est masquée en production : le client
  // doit voir un message lisible, rester sur /reserver et garder sa saisie.

  const REFUSAL_IN = fd("2026-10-12");
  const REFUSAL_OUT = fd("2026-10-15");

  // Avant hydratation, React écrase la saisie par l'état initial : on réessaie jusqu'à ce qu'elle tienne.
  async function fillRefusalDates(page: import("@playwright/test").Page) {
    await expect(async () => {
      await page.fill('[name="checkIn"]', REFUSAL_IN);
      await page.fill('[name="checkOut"]', REFUSAL_OUT);
      await expect(page.locator('[name="checkIn"]')).toHaveValue(REFUSAL_IN, { timeout: 500 });
      await expect(page.locator('[name="checkOut"]')).toHaveValue(REFUSAL_OUT, { timeout: 500 });
    }).toPass({ timeout: 10_000 });
  }

  async function fillGuest(page: import("@playwright/test").Page, email: string) {
    await page.fill('[name="guestName"]', "Client Refusé");
    await page.fill('[name="guestEmail"]', email);
    await page.fill('[name="guestPhone"]', "0601020304");
  }

  async function bookingCount(email: string) {
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const { rowCount } = await pool.query("SELECT 1 FROM bookings WHERE guest_email = $1", [email]);
    await pool.end();
    return rowCount;
  }

  test("dates réservées entre-temps : message lisible, saisie conservée, aucune résa créée", async ({ page }) => {
    const { tenantId, apiRoomId } = loadTestContext();
    const email = `refus-${Date.now()}@example.com`;
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    let rivalId: string | undefined;
    try {
      await page.goto(`/reserver/${apiRoomId}`);
      await fillRefusalDates(page);
      await expect(page.getByText("Disponible", { exact: true })).toBeVisible({ timeout: 8000 });
      await fillGuest(page, email);

      // Un autre client prend ces nuits pendant que celui-ci remplit le formulaire.
      const { rows } = await pool.query(
        `INSERT INTO bookings (tenant_id, room_id, check_in, check_out, total_price, status, guest_name, guest_email, guest_count, source)
         VALUES ($1, $2, $3, $4, '300.00', 'pending', 'Plus Rapide', 'rapide@example.com', 1, 'direct') RETURNING id`,
        [tenantId, apiRoomId, REFUSAL_IN, REFUSAL_OUT],
      );
      rivalId = rows[0].id;

      await page.locator('[type="submit"]').click();

      await expect(page.getByTestId("booking-error")).toContainText("viennent d'être réservées");
      await expect(page).toHaveURL(new RegExp(`/reserver/${apiRoomId}`));
      await expect(page.locator('[name="guestEmail"]')).toHaveValue(email);
      await expect(page.locator('[name="guestName"]')).toHaveValue("Client Refusé");
      // La dispo est revérifiée après le refus : plus de bouton « payer » actif.
      await expect(page.getByText("Non disponible pour ces dates")).toBeVisible({ timeout: 8000 });
      await expect(page.locator('[type="submit"]')).toBeDisabled();
      expect(await bookingCount(email)).toBe(0);
    } finally {
      if (rivalId) await pool.query("DELETE FROM bookings WHERE id = $1", [rivalId]);
      await pool.query("DELETE FROM bookings WHERE guest_email = $1", [email]);
      await pool.end();
    }
  });

  test("email invalide posté sans validation navigateur : message lisible, pas de crash", async ({ page }) => {
    const { apiRoomId } = loadTestContext();
    await page.goto(`/reserver/${apiRoomId}`);
    await fillRefusalDates(page);
    await expect(page.getByText("Disponible", { exact: true })).toBeVisible({ timeout: 8000 });
    await fillGuest(page, "pas-un-email");
    // Contourne la validation HTML (type=email) pour atteindre le serveur.
    await page.locator("form").evaluate((f: HTMLFormElement) => (f.noValidate = true));

    await page.locator('[type="submit"]').click();

    await expect(page.getByTestId("booking-error")).toContainText("Adresse email invalide");
    await expect(page).toHaveURL(new RegExp(`/reserver/${apiRoomId}`));
    await expect(page.locator('[name="guestEmail"]')).toHaveValue("pas-un-email");
    expect(await bookingCount("pas-un-email")).toBe(0);
  });

  test("Stripe indisponible : message lisible et la résa pending est retirée", async ({ page }) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
    test.skip(!!stripeKey && !stripeKey.includes("XXXX") && !stripeKey.includes("placeholder"), "vraie clé Stripe : la session serait créée");
    const { apiRoomId } = loadTestContext();
    const email = `nostripe-${Date.now()}@example.com`;
    try {
      await page.goto(`/reserver/${apiRoomId}`);
      await fillRefusalDates(page);
      await expect(page.getByText("Disponible", { exact: true })).toBeVisible({ timeout: 8000 });
      await fillGuest(page, email);

      await page.locator('[type="submit"]').click();

      await expect(page.getByTestId("booking-error")).toContainText("paiement en ligne est momentanément indisponible");
      await expect(page).toHaveURL(new RegExp(`/reserver/${apiRoomId}`));
      expect(await bookingCount(email)).toBe(0);
    } finally {
      const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
      await pool.query("DELETE FROM bookings WHERE guest_email = $1", [email]);
      await pool.end();
    }
  });

  // ─── Contrôles serveur contournant le navigateur (audit 2026-10/05) ──────────

  /** Remplit le formulaire puis retire les garde-fous navigateur (min/max, validation HTML). */
  async function tamperedSubmit(page: import("@playwright/test").Page, email: string, guests: string) {
    await fillGuest(page, email);
    await page.locator("form").evaluate((f: HTMLFormElement, g) => {
      f.noValidate = true;
      (f.querySelector('[type="submit"]') as HTMLButtonElement).disabled = false;
      // Champ contrôlé et borné à la capacité côté client : on écrit directement dans le DOM.
      (f.elements.namedItem("guestCount") as HTMLInputElement).value = g;
    }, guests);
    await page.locator('[type="submit"]').click();
  }

  test("capacité : 3 voyageurs (chambre de 2) refusés côté serveur, 2 admis (limite)", async ({ page }) => {
    const { apiRoomId } = loadTestContext();
    const email = `capa-pub-${Date.now()}@example.com`;
    try {
      await page.goto(`/reserver/${apiRoomId}`);
      await fillRefusalDates(page);
      await expect(page.getByText("Disponible", { exact: true })).toBeVisible({ timeout: 8000 });
      await tamperedSubmit(page, email, "3");
      await expect(page.getByTestId("booking-error")).toContainText("accueille 2 personnes maximum");
      expect(await bookingCount(email)).toBe(0);

      // Limite : 2 = capacité → admis. Sans vraie clé Stripe, on s'arrête au paiement
      // (pending retiré) ; avec une vraie clé, redirection Stripe.
      await expect(page.getByText("Disponible", { exact: true })).toBeVisible({ timeout: 8000 });
      await tamperedSubmit(page, email, "2");
      const key = process.env.STRIPE_SECRET_KEY ?? "";
      if (!key || key.includes("XXXX") || key.includes("placeholder")) {
        await expect(page.getByTestId("booking-error")).toContainText("paiement en ligne est momentanément indisponible");
      } else {
        await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 15000 });
      }
    } finally {
      const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
      await pool.query("DELETE FROM bookings WHERE guest_email = $1", [email]);
      await pool.end();
    }
  });

  test("arrivée hier postée sans validation navigateur : refusée avec un message lisible", async ({ page }) => {
    const { apiRoomId } = loadTestContext();
    const email = `hier-${Date.now()}@example.com`;
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
    const yesterday = new Date(Date.parse(today + "T00:00:00Z") - 86_400_000).toISOString().slice(0, 10);
    await page.goto(`/reserver/${apiRoomId}`);
    await expect(async () => {
      await page.fill('[name="checkIn"]', yesterday);
      await page.fill('[name="checkOut"]', today);
      await expect(page.locator('[name="checkIn"]')).toHaveValue(yesterday, { timeout: 500 });
    }).toPass({ timeout: 10_000 });
    await expect(page.getByText(/^(Non d|D)isponible/).first()).toBeVisible({ timeout: 8000 });
    await tamperedSubmit(page, email, "1");
    await expect(page.getByTestId("booking-error")).toContainText("La date d'arrivée est déjà passée");
    expect(await bookingCount(email)).toBe(0);
  });
});
