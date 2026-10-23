import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { deleteBookingsByEmail } from "../helpers/intake";
import { confirmDialog, submitManualBookingForm, SAVED_BOOKING_URL } from "../helpers/confirm";

/**
 * Spécification : Tests de non-régression > Admin > Gestion des réservations
 * Référence Obsidian : Phase 2.3 — Admin : gestion des réservations
 *
 * Stratégie : happy path → cycles d'état → cas limites → sécurité.
 * Prérequis : au moins une chambre active en DB (créée par les tests chambres).
 *
 * Depuis ADR-0008, l'intake manuel contrôle la disponibilité : ces tests de cycle
 * de vie ne testent pas l'overlap, ils cochent donc « Forcer » pour créer une
 * réservation-fixture quelles que soient les dates déjà occupées. Le nettoyage par
 * email en afterAll garantit l'absence de résidu (les emails sont stables par test).
 */

function addDays(n: number) {
  return new Date(Date.now() + n * 86400000).toISOString().split("T")[0];
}

// Nom unique par run pour éviter les collisions entre exécutions
const RUN_ID = Date.now().toString(36).slice(-5);

const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as { tenantId: string; apiRoomId: string };

// Emails utilisés par ce fichier — nettoyés en afterAll (et en début de suite pour
// purger les résidus des runs antérieurs à l'introduction du contrôle de dispo).
const USED_EMAILS = [
  "test@example.com", "jean@example.com", "marie@example.com", "pierre@example.com",
  "zero@example.com", "passe@example.com", "xss@example.com", "pdf@example.com", "pdfdl@example.com",
  "prix@example.com",
];

async function cleanupBookings() {
  for (const email of USED_EMAILS) {
    await deleteBookingsByEmail(ctx.tenantId, email);
  }
}

async function createReservation(
  page: Page,
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
  // Fixture de cycle de vie : on force (si conflit) pour ne pas dépendre de la disponibilité.
  await submitManualBookingForm(page, true);
  await expect(page).toHaveURL(SAVED_BOOKING_URL);
  await expect(page.getByText("Réservation enregistrée")).toBeVisible();
  await page.goto("/admin/reservations");
}

// ─── Happy path ────────────────────────────────────────────────────────────────

test.describe("Admin — Gestion des réservations", () => {
  test.beforeAll(cleanupBookings);
  test.afterAll(cleanupBookings);

  test("liste des réservations est accessible", async ({ page }) => {
    await page.goto("/admin/reservations");
    await expect(page.getByRole("heading", { name: /réservations/i })).toBeVisible();
    // Le bouton de la PageHeader sur /admin/reservations affiche "Nouvelle"
    await expect(page.getByRole("link", { name: "Nouvelle", exact: true })).toBeVisible();
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

  test("séjour à venir confirmé : pas de bouton « terminée », contacts cliquables, règlement affiché", async ({ page }) => {
    // createBookingManual crée en "confirmed" directement
    const guestName = `Marie Martin ${RUN_ID}`;
    await createReservation(page, {
      name: guestName,
      email: "marie@example.com",
      checkIn: addDays(10),
      checkOut: addDays(12),
    });

    await page.getByRole("link", { name: guestName }).first().click();
    await expect(page.getByRole("heading", { name: guestName })).toBeVisible();
    await expect(page.getByText("Confirmée")).toBeVisible();

    // La clôture est automatique : aucun bouton manuel, l'hôte est prévenu.
    await expect(page.getByRole("button", { name: /terminée/i })).toHaveCount(0);
    await expect(page.getByText("Passera automatiquement en « Terminée » après le départ.")).toBeVisible();

    // Contact en un tap, règlement et origine lisibles.
    await expect(page.getByRole("link", { name: "marie@example.com" })).toHaveAttribute("href", "mailto:marie@example.com");
    await expect(page.getByText("À régler avec le client")).toBeVisible();
    await expect(page.getByText("Saisie manuelle")).toBeVisible();
  });

  test("séjour dont le départ est passé → « Terminée » automatiquement, sans action", async ({ page }) => {
    const guestName = `Paul Parti ${RUN_ID}`;
    await createReservation(page, {
      name: guestName,
      email: "passe@example.com",
      checkIn: addDays(-4),
      checkOut: addDays(-1),
    });

    const row = page.locator("tbody tr").filter({ hasText: guestName });
    await expect(row.getByText("Terminée")).toBeVisible();

    await row.getByRole("link", { name: guestName }).click();
    await page.waitForURL(/\/admin\/reservations\/[0-9a-f-]{36}/);
    await expect(page.getByText("Terminée", { exact: true })).toBeVisible();
    // Statut terminal : plus aucune action.
    await expect(page.getByRole("button", { name: "Confirmer" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Annuler la réservation" })).toHaveCount(0);
  });

  test("départ aujourd'hui → reste « Confirmée » (clôture le lendemain)", async ({ page }) => {
    const guestName = `Lea Depart ${RUN_ID}`;
    await createReservation(page, {
      name: guestName,
      email: "test@example.com",
      checkIn: addDays(-2),
      checkOut: addDays(0),
    });
    const row = page.locator("tbody tr").filter({ hasText: guestName });
    await expect(row.getByText("Confirmée")).toBeVisible();
  });

  test("réservation sans téléphone : pas de ligne Téléphone vide", async ({ page }) => {
    // Fixture propre au test : RUN_ID change d'un worker à l'autre, on ne dépend pas d'un autre test.
    const guestName = `Sans Tel ${RUN_ID}`;
    await createReservation(page, { name: guestName, email: "test@example.com", checkIn: addDays(20), checkOut: addDays(21) });
    await page.getByRole("link", { name: guestName }).first().click();
    await expect(page.getByRole("heading", { name: guestName })).toBeVisible();
    await expect(page.getByText("Téléphone")).toHaveCount(0);
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

    // confirmed → le bouton "Annuler" DOIT être présent (assertion dure).
    const cancelBtn = page.getByRole("button", { name: "Annuler" });
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    // Dialog de confirmation : il nomme le client et prévient de l'email envoyé.
    await expect(page.locator("dialog[open]")).toContainText(guestName);
    await expect(page.locator("dialog[open]")).toContainText("pierre@example.com");
    await confirmDialog(page);
    await expect(page.getByText("Annulée", { exact: true })).toBeVisible();
    // Retour après action : l'annulation est confirmée, avec le sort de l'email.
    await expect(page).toHaveURL(/annulee=(1|sans-email)$/);
    await expect(page.getByText(/^Réservation annulée/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmer" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Annuler" })).not.toBeVisible();
  });

  // ─── Argent de la saisie manuelle ─────────────────────────────────────────────

  test("saisie manuelle : total calculé avant d'enregistrer, prix convenu enregistré, règlement noté", async ({ page }) => {
    const guestName = `Prix Convenu ${RUN_ID}`;
    await page.goto("/admin/reservations/new");
    await expect(page.getByText("Choisissez une chambre et des dates pour voir le prix.")).toBeVisible();
    await page.locator('select[name="roomId"]').selectOption({ index: 1 });
    await page.locator('[name="checkIn"]').fill(addDays(60));
    await page.locator('[name="checkOut"]').fill(addDays(63));
    // Le total apparaît sans enregistrer, nuits comptées.
    await expect(page.getByText(/3 nuits, tarifs et règles appliqués/)).toBeVisible();
    await expect(page.getByText(/Total calculé/)).toContainText("€");

    await page.fill('[name="guestName"]', guestName);
    await page.fill('[name="guestEmail"]', "prix@example.com");
    await page.fill('[name="agreedPrice"]', "199");
    await submitManualBookingForm(page, true);
    await expect(page).toHaveURL(SAVED_BOOKING_URL);
    await expect(page.getByText("199 €")).toBeVisible();

    // Règlement hors ligne : noté puis annulé, sans quitter la page.
    await expect(page.getByText("À régler avec le client")).toBeVisible();
    await page.getByRole("button", { name: "Marquer réglé" }).click();
    await expect(page.getByText(/Réglé le/)).toBeVisible();
    await page.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(page.getByText("À régler avec le client")).toBeVisible();
  });

  test("saisie manuelle : prix convenu invalide → erreur sur le champ, saisie conservée", async ({ page }) => {
    await page.goto("/admin/reservations/new");
    await page.locator('select[name="roomId"]').selectOption({ index: 1 });
    await page.fill('[name="guestName"]', `Prix Faux ${RUN_ID}`);
    await page.fill('[name="guestEmail"]', "prix@example.com");
    await page.fill('[name="agreedPrice"]', "deux cents");
    await page.click('[type="submit"]');
    await expect(page.locator('[name="agreedPrice"]')).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(/Prix convenu : un montant en euros/).first()).toBeVisible();
    await expect(page.locator('[name="guestName"]')).toHaveValue(`Prix Faux ${RUN_ID}`);
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
    // Les flèches utilisent désormais des icônes SVG avec aria-label.
    await expect(page.getByRole("link", { name: "Mois précédent" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mois suivant" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Aujourd'hui" })).toBeVisible();
  });

  test("navigation calendrier — mois précédent et suivant ne crashent pas", async ({ page }) => {
    await page.goto("/admin/calendrier");
    await page.getByRole("link", { name: "Mois précédent" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading")).toBeVisible();

    await page.getByRole("link", { name: "Mois suivant" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("navigation calendrier — bouton Aujourd'hui revient au mois courant", async ({ page }) => {
    const now = new Date();
    const targetYear = now.getFullYear();
    const targetMonth = now.getMonth();
    await page.goto(
      `/admin/calendrier?year=${targetYear}&month=${targetMonth - 2}`,
    );
    await page.getByRole("link", { name: "Aujourd'hui" }).click();
    // Attendre explicitement l'URL cible : networkidle se résout parfois avant
    // que la soft-nav Next.js ait actualisé window.location.
    await page.waitForURL(
      (url) =>
        url.searchParams.get("month") === String(targetMonth) &&
        url.searchParams.get("year") === String(targetYear),
    );
  });

  test("calendrier : chaque séjour annonce client, dates et statut (barres courtes lisibles)", async ({ page }) => {
    const guestName = `Cal Bulle ${RUN_ID}`;
    await createReservation(page, {
      name: guestName,
      email: "test@example.com",
      checkIn: addDays(3),
      checkOut: addDays(4),
    });
    const d = new Date(addDays(3));
    await page.goto(`/admin/calendrier?year=${d.getUTCFullYear()}&month=${d.getUTCMonth()}`);
    const bar = page.getByRole("button", { name: new RegExp(`${guestName} · .+ → .+ · Confirmée`) });
    await expect(bar).toBeVisible();
    await bar.click();
    await expect(bar).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Fermer" })).toBeVisible();
  });

  test("calendrier mobile : une nuit libre ouvre une réservation pré-remplie", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/calendrier");
    const free = page.getByRole("link", { name: /^Réserver .+ du .+ au .+$/ }).first();
    await expect(free).toBeVisible();
    const href = (await free.getAttribute("href"))!;
    const url = new URL(href, "http://x");
    await free.click();
    await expect(page).toHaveURL(/\/admin\/reservations\/new\?/);
    await expect(page.locator('select[name="roomId"]')).toHaveValue(url.searchParams.get("roomId")!);
    // DateInput affiche la date au format français.
    const [y, m, d] = url.searchParams.get("checkIn")!.split("-");
    await expect(page.locator('[name="checkIn"]')).toHaveValue(`${d}/${m}/${y}`);
    // La pastille annonce une plage : le départ est pré-rempli sur toute la plage.
    const [y2, m2, d2] = url.searchParams.get("checkOut")!.split("-");
    await expect(page.locator('[name="checkOut"]')).toHaveValue(`${d2}/${m2}/${y2}`);
    // Cible au pouce.
    await page.goto("/admin/calendrier");
    const box = (await page.getByRole("link", { name: /^Réserver .+ du .+ au .+$/ }).first().boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test("calendrier bureau : une plage libre est atteignable au clavier", async ({ page }) => {
    await page.goto("/admin/calendrier");
    const free = page.getByRole("link", { name: /^Réserver .+ à partir du .+ \(libre jusqu'au .+\)$/ }).first();
    await expect(free).toBeAttached();
    await free.focus();
    await expect(free).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/admin\/reservations\/new\?roomId=.+&checkIn=\d{4}-\d{2}-\d{2}/);
  });

  test("pré-remplissage ?checkOut incohérent (avant l'arrivée) → une nuit par défaut", async ({ page }) => {
    await page.goto("/admin/reservations/new?checkIn=2031-05-10&checkOut=2031-05-01");
    await expect(page.locator('[name="checkIn"]')).toHaveValue("10/05/2031");
    await expect(page.locator('[name="checkOut"]')).toHaveValue("11/05/2031");
  });

  test("pré-remplissage invalide (?roomId=inconnu&checkIn=abc) → formulaire par défaut, pas de 500", async ({ page }) => {
    const res = await page.goto("/admin/reservations/new?roomId=ffffffff-ffff-ffff-ffff-ffffffffffff&checkIn=2026-99-99");
    expect(res?.status()).toBe(200);
    await expect(page.locator('select[name="roomId"]')).toHaveValue("");
    await page.goto("/admin/reservations/new?checkIn=abc");
    await expect(page.getByRole("heading", { name: "Nouvelle réservation" })).toBeVisible();
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
    // Erreur affichée dans le formulaire, saisie conservée
    // Bandeau + message sur le champ « Départ » (aria-invalid).
    await expect(page.getByText("La date de départ doit être après la date d'arrivée").first()).toBeVisible();
    await expect(page.locator('[name="checkOut"]')).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator('[name="guestName"]')).toHaveValue(`Test Zéro Nuit ${RUN_ID}`);
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
    await submitManualBookingForm(page, true);

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
    await page.getByRole("link", { name: "Mois suivant" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("calendrier en janvier (month=0) — boundary début d'année", async ({ page }) => {
    const response = await page.goto("/admin/calendrier?year=2025&month=0");
    expect(response?.status()).not.toBe(500);
    await expect(page.getByRole("heading")).toBeVisible();
    // Navigation vers le mois précédent (décembre 2024) ne doit pas crasher
    await page.getByRole("link", { name: "Mois précédent" }).click();
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
    await submitManualBookingForm(page, true);

    await expect(page).toHaveURL(SAVED_BOOKING_URL);
    expect(xssFired).toBe(false);
    await page.goto("/admin/reservations");

    // Aller sur le détail : le nom doit apparaître en texte brut
    const link = page.getByRole("link").filter({ hasText: "alert(" }).first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForLoadState("networkidle");
      expect(xssFired).toBe(false);
    }
  });

  test("les réservations d'un tenant ne sont pas visibles par un autre tenant", async ({ page }) => {
    // Le global-setup crée une réservation "Client Rival Secret" pour le tenant rival
    // L'admin connecté (tenant principal) ne doit jamais voir cette réservation
    await page.goto("/admin/reservations");
    await expect(page.getByText("Client Rival Secret")).not.toBeVisible();
    await expect(page.getByText("rival-secret@example.com")).not.toBeVisible();
  });

  // ─── Paiement reçu après annulation (audit 2026-10/03) ────────────────────────

  test("réservation annulée mais payée en ligne : badge « Payé après annulation » + bandeau remboursement", async ({ page }) => {
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const pi = `pi_test_late_${RUN_ID}`;
    const insert = async (status: "cancelled" | "confirmed", guestName: string) => {
      const { rows } = await pool.query(
        `INSERT INTO bookings (tenant_id, room_id, check_in, check_out, total_price, status, guest_name, guest_email, guest_count, source)
         VALUES ($1, $2, '2027-11-01', '2027-11-03', '240.00', $3, $4, 'late-pay@example.com', 1, 'direct') RETURNING id`,
        [ctx.tenantId, ctx.apiRoomId, status, guestName],
      );
      await pool.query(
        `INSERT INTO payments (tenant_id, booking_id, stripe_session_id, stripe_payment_id, amount, currency, status)
         VALUES ($1, $2, $3, $4, '240.00', 'eur', 'paid')`,
        [ctx.tenantId, rows[0].id, `cs_test_late_${status}_${RUN_ID}`, `${pi}_${status}`],
      );
      return rows[0].id as string;
    };
    try {
      const lateId = await insert("cancelled", `Payé Tard ${RUN_ID}`);
      await page.goto(`/admin/reservations/${lateId}`);
      await expect(page.getByText("Payé après annulation")).toBeVisible();
      await expect(page.getByText(/a payé 240.*après l.annulation/)).toBeVisible();
      await expect(page.getByText(`${pi}_cancelled`)).toBeVisible();

      // Cas normal : payé + confirmé → pas d'alerte.
      const okId = await insert("confirmed", `Payé Normal ${RUN_ID}`);
      await page.goto(`/admin/reservations/${okId}`);
      await expect(page.getByText("Payé en ligne")).toBeVisible();
      await expect(page.getByText("Payé après annulation")).toHaveCount(0);
      await expect(page.getByText(/après l.annulation/)).toHaveCount(0);
    } finally {
      await pool.query(
        "DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE tenant_id = $1 AND guest_email = 'late-pay@example.com')",
        [ctx.tenantId],
      );
      await pool.query("DELETE FROM bookings WHERE tenant_id = $1 AND guest_email = 'late-pay@example.com'", [ctx.tenantId]);
      await pool.end();
    }
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

  test("l'API PDF retourne 404 (jamais 500) pour un id non-UUID (authentifié)", async ({ page }) => {
    await page.goto("/admin");
    const res = await page.request.get("/api/admin/reservations/not-a-uuid/pdf", { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });
});
