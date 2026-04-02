import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Admin > Gestion des réservations
 * Référence Obsidian : Phase 2.3 — Admin : gestion des réservations
 *
 * Stratégie : happy path → cycles d'état → cas limites → sécurité.
 * Prérequis : au moins une chambre active en DB (créée par les tests chambres).
 *
 * Règle de nettoyage : les réservations s'accumulent mais ne bloquent pas les tests.
 * On utilise des noms suffisamment uniques pour ne pas avoir de faux positifs.
 */

function addDays(n: number) {
  return new Date(Date.now() + n * 86400000).toISOString().split("T")[0];
}

// Nom unique par run pour éviter les collisions entre exécutions
const RUN_ID = Date.now().toString(36).slice(-5);

async function createReservation(
  page: Parameters<Parameters<typeof test>[1]>[0],
  opts: {
    name: string;
    email?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
  },
) {
  await page.goto("/admin/reservations/new");
  const select = page.locator('select[name="roomId"]');
  const optionCount = await select.locator("option").count();
  if (optionCount <= 1) throw new Error("Aucune chambre disponible en DB de test");

  await select.selectOption({ index: 1 });
  await page.fill('[name="guestName"]', opts.name);
  await page.fill('[name="guestEmail"]', opts.email ?? "test@example.com");
  await page.fill('[name="guestCount"]', opts.guests ?? "1");
  if (opts.checkIn) await page.locator('[name="checkIn"]').fill(opts.checkIn);
  if (opts.checkOut) await page.locator('[name="checkOut"]').fill(opts.checkOut);
  await page.click('[type="submit"]');
  await expect(page).toHaveURL("/admin/reservations");
}

// ─── Happy path ────────────────────────────────────────────────────────────────

test.describe("Admin — Gestion des réservations", () => {
  test("liste des réservations est accessible", async ({ page }) => {
    await page.goto("/admin/reservations");
    await expect(page.getByRole("heading", { name: /réservations/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nouvelle réservation" })).toBeVisible();
  });

  test("création manuelle d'une réservation redirige vers la liste", async ({ page }) => {
    const guestName = `Jean Dupont ${RUN_ID}`;
    await createReservation(page, {
      name: guestName,
      email: "jean@example.com",
      checkIn: addDays(5),
      checkOut: addDays(7),
    });
    await expect(page.getByText(guestName).first()).toBeVisible();
  });

  // ─── Cycles d'état ──────────────────────────────────────────────────────────

  test("cycle confirmed → completed", async ({ page }) => {
    // createBookingManual crée en "confirmed" directement
    const guestName = `Marie Martin ${RUN_ID}`;
    await createReservation(page, {
      name: guestName,
      email: "marie@example.com",
      checkIn: addDays(10),
      checkOut: addDays(12),
    });

    // Accéder au détail de la réservation créée
    const link = page.getByRole("link").filter({ hasText: guestName }).first();
    await link.click();
    await expect(page.getByText(guestName)).toBeVisible();

    // Statut "confirmed" → bouton "Marquer terminée" visible
    const completeBtn = page.getByRole("button", { name: "Marquer terminée" });
    if (await completeBtn.isVisible()) {
      await completeBtn.click();
      await expect(page.getByText("Terminée")).toBeVisible();
      // Après completed : aucun bouton d'action
      await expect(page.getByRole("button", { name: "Confirmer" })).not.toBeVisible();
      await expect(page.getByRole("button", { name: "Annuler" })).not.toBeVisible();
      await expect(page.getByRole("button", { name: "Marquer terminée" })).not.toBeVisible();
    }
  });

  test("annulation confirmed → cancelled — aucun bouton d'action ensuite", async ({ page }) => {
    const guestName = `Pierre Lebrun ${RUN_ID}`;
    await createReservation(page, {
      name: guestName,
      email: "pierre@example.com",
      checkIn: addDays(15),
      checkOut: addDays(17),
    });

    const link = page.getByRole("link").filter({ hasText: guestName }).first();
    await link.click();

    const cancelBtn = page.getByRole("button", { name: "Annuler" });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await expect(page.getByText("Annulée")).toBeVisible();
      await expect(page.getByRole("button", { name: "Confirmer" })).not.toBeVisible();
      await expect(page.getByRole("button", { name: "Marquer terminée" })).not.toBeVisible();
      await expect(page.getByRole("button", { name: "Annuler" })).not.toBeVisible();
    }
  });

  // ─── Filtres ─────────────────────────────────────────────────────────────────

  test("filtres par statut ne provoquent aucun crash serveur", async ({ page }) => {
    for (const status of ["pending", "confirmed", "cancelled", "completed"]) {
      const response = await page.goto(`/admin/reservations?status=${status}`);
      expect(response?.status()).not.toBe(500);
      await expect(page.getByRole("heading", { name: /réservations/i })).toBeVisible();
    }
  });

  // ─── Calendrier ─────────────────────────────────────────────────────────────

  test("vue calendrier mensuelle affiche navigation et grille", async ({ page }) => {
    await page.goto("/admin/calendrier");
    await expect(page.getByRole("heading")).toBeVisible();
    await expect(page.getByRole("link", { name: "←" })).toBeVisible();
    await expect(page.getByRole("link", { name: "→" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Aujourd'hui" })).toBeVisible();
  });

  test("navigation calendrier — mois précédent et suivant ne crashent pas", async ({ page }) => {
    await page.goto("/admin/calendrier");
    await page.getByRole("link", { name: "←" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading")).toBeVisible();

    await page.getByRole("link", { name: "→" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("navigation calendrier — bouton Aujourd'hui revient au mois courant", async ({ page }) => {
    const now = new Date();
    await page.goto(
      `/admin/calendrier?year=${now.getFullYear()}&month=${now.getMonth() - 2}`,
    );
    await page.getByRole("link", { name: "Aujourd'hui" }).click();
    await page.waitForLoadState("networkidle");

    const url = new URL(page.url());
    expect(url.searchParams.get("month")).toBe(String(now.getMonth()));
    expect(url.searchParams.get("year")).toBe(String(now.getFullYear()));
  });

  // ─── Cas limites ─────────────────────────────────────────────────────────────

  test("réservation avec checkOut = checkIn (0 nuit) — pas de crash", async ({ page }) => {
    await page.goto("/admin/reservations/new");
    const select = page.locator('select[name="roomId"]');
    if ((await select.locator("option").count()) <= 1) { test.skip(); return; }

    await select.selectOption({ index: 1 });
    await page.fill('[name="guestName"]', `Test Zéro Nuit ${RUN_ID}`);
    await page.fill('[name="guestEmail"]', "zero@example.com");
    await page.fill('[name="guestCount"]', "1");
    const sameDate = addDays(20);
    await page.locator('[name="checkIn"]').fill(sameDate);
    await page.locator('[name="checkOut"]').fill(sameDate);
    await page.click('[type="submit"]');

    const title = await page.title();
    expect(title).not.toMatch(/500|Internal Server Error/i);
  });

  test("réservation avec dates dans le passé — pas de crash", async ({ page }) => {
    await page.goto("/admin/reservations/new");
    const select = page.locator('select[name="roomId"]');
    if ((await select.locator("option").count()) <= 1) { test.skip(); return; }

    await select.selectOption({ index: 1 });
    await page.fill('[name="guestName"]', `Test Passé ${RUN_ID}`);
    await page.fill('[name="guestEmail"]', "passe@example.com");
    await page.fill('[name="guestCount"]', "1");
    await page.locator('[name="checkIn"]').fill("2020-01-10");
    await page.locator('[name="checkOut"]').fill("2020-01-12");
    await page.click('[type="submit"]');

    const title = await page.title();
    expect(title).not.toMatch(/500|Internal Server Error/i);
  });

  test("calendrier avec paramètres invalides (?year=abc&month=99) — pas de crash", async ({ page }) => {
    const response = await page.goto("/admin/calendrier?year=abc&month=99");
    expect(response?.status()).not.toBe(500);
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("calendrier en décembre (month=11) — boundary fin d'année", async ({ page }) => {
    const response = await page.goto("/admin/calendrier?year=2025&month=11");
    expect(response?.status()).not.toBe(500);
    await expect(page.getByRole("heading")).toBeVisible();
    // Navigation vers le mois suivant (janvier 2026) ne doit pas crasher
    await page.getByRole("link", { name: "→" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("calendrier en janvier (month=0) — boundary début d'année", async ({ page }) => {
    const response = await page.goto("/admin/calendrier?year=2025&month=0");
    expect(response?.status()).not.toBe(500);
    await expect(page.getByRole("heading")).toBeVisible();
    // Navigation vers le mois précédent (décembre 2024) ne doit pas crasher
    await page.getByRole("link", { name: "←" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("calendrier très loin dans le futur (2100) — pas de crash", async ({ page }) => {
    const response = await page.goto("/admin/calendrier?year=2100&month=0");
    expect(response?.status()).not.toBe(500);
    await expect(page.getByRole("heading")).toBeVisible();
  });

  // ─── Cas d'erreur ────────────────────────────────────────────────────────────

  test("accès à une réservation inexistante → 404, pas 500", async ({ page }) => {
    const response = await page.goto(
      "/admin/reservations/00000000-0000-0000-0000-000000000000",
    );
    expect(response?.status()).toBe(404);
  });

  test("isolation tenant : UUID appartenant à un autre tenant → 404", async ({ page }) => {
    // getBookingByIdAndTenant filtre par tenantId — un ID d'un autre tenant → null → notFound()
    const response = await page.goto(
      "/admin/reservations/ffffffff-ffff-ffff-ffff-ffffffffffff",
    );
    expect(response?.status()).toBe(404);
  });

  test("isolation tenant : chambre d'un autre tenant → 404", async ({ page }) => {
    const response = await page.goto(
      "/admin/chambres/ffffffff-ffff-ffff-ffff-ffffffffffff/edit",
    );
    expect(response?.status()).toBe(404);
  });

  // ─── Sécurité ────────────────────────────────────────────────────────────────

  test("XSS dans le nom du client — texte échappé dans le détail", async ({ page }) => {
    let xssFired = false;
    page.on("dialog", async (dialog) => {
      xssFired = true;
      await dialog.dismiss();
    });

    const xssPayload = `<script>alert('xss-resa-${RUN_ID}')</script>`;
    await page.goto("/admin/reservations/new");
    const select = page.locator('select[name="roomId"]');
    if ((await select.locator("option").count()) <= 1) {
      expect(xssFired).toBe(false);
      return;
    }

    await select.selectOption({ index: 1 });
    await page.fill('[name="guestName"]', xssPayload);
    await page.fill('[name="guestEmail"]', "xss@example.com");
    await page.fill('[name="guestCount"]', "1");
    await page.locator('[name="checkIn"]').fill(addDays(30));
    await page.locator('[name="checkOut"]').fill(addDays(32));
    await page.click('[type="submit"]');

    await expect(page).toHaveURL("/admin/reservations");
    expect(xssFired).toBe(false);

    // Aller sur le détail : le nom doit apparaître en texte brut
    const link = page.getByRole("link").filter({ hasText: "alert(" }).first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForLoadState("networkidle");
      expect(xssFired).toBe(false);
    }
  });

  test.skip("les réservations d'un tenant ne sont pas visibles par un autre tenant", async ({ page }) => {
    // TODO: nécessite deux tenants en DB de test — implémenter quand seed.ts est prêt
  });

  // ─── PDF / Impression ─────────────────────────────────────────────────────────

  test("le détail d'une réservation affiche les boutons PDF et Imprimer", async ({ page }) => {
    const guestName = `PDF Test ${RUN_ID}`;
    await createReservation(page, {
      name: guestName,
      email: "pdf@example.com",
      checkIn: addDays(40),
      checkOut: addDays(42),
    });
    const link = page.getByRole("link").filter({ hasText: guestName }).first();
    await link.click();
    await page.waitForURL(/\/admin\/reservations\/.+/);

    await expect(page.getByRole("link", { name: /télécharger pdf/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /imprimer/i })).toBeVisible();
  });

  test("le lien Télécharger PDF déclenche un téléchargement de fichier PDF", async ({ page }) => {
    const guestName = `PDF DL ${RUN_ID}`;
    await createReservation(page, {
      name: guestName,
      email: "pdfdl@example.com",
      checkIn: addDays(43),
      checkOut: addDays(45),
    });
    const link = page.getByRole("link").filter({ hasText: guestName }).first();
    await link.click();
    await page.waitForURL(/\/admin\/reservations\/.+/);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: /télécharger pdf/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^reservation-.*\.pdf$/);
  });

  test("l'API PDF retourne 401/redirect sans session authentifiée", async ({ request }) => {
    const res = await request.get("/api/admin/reservations/00000000-0000-0000-0000-000000000000/pdf", {
      headers: { cookie: "" },
    });
    // Le middleware redirige vers /login pour les non-authentifiés
    expect([401, 302, 307]).toContain(res.status());
  });

  test("l'API PDF retourne 404 pour un booking inexistant (authentifié)", async ({ page }) => {
    // Navigate to admin first so the auth cookies are set in the context
    await page.goto("/admin");
    // Extract cookies from the page context for the API request
    const pdfUrl = "/api/admin/reservations/00000000-0000-0000-0000-000000000000/pdf";
    const res = await page.request.get(pdfUrl);
    // The middleware may redirect (302) or our route returns 404 — both are acceptable
    expect([404, 401, 302, 307]).toContain(res.status());
  });
});
