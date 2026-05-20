import { test, expect, type Page } from "@playwright/test";
import { resetTenantContentSeed } from "../helpers/seed-tenant-config";

/**
 * Spécification : Tests de non-régression > Admin > Paramètres contenu
 *
 * Source de vérité : `Tests de non-régression.md` — section Admin / Paramètres
 * Couvre : édition des textes hero/story/footer et persistance vers les pages
 * publiques (homepage). Inclut happy path, cas limites, sécurité.
 */

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@test.maresa";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "password";

// Marqueur unique pour éviter les collisions entre runs successifs
const RUN_ID = `R${Date.now().toString(36).slice(-6)}`;

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill('[name="email"]', ADMIN_EMAIL);
  await page.fill('[name="password"]', ADMIN_PASSWORD);
  await page.click('[type="submit"]');
  await page.waitForURL(/\/admin/);
}

/**
 * Vide la section « Chiffres clés ». Le global setup en seed 4 (= MAX_STATS),
 * ce qui masque le bouton « + Ajouter un chiffre » nécessaire à ces tests.
 * On supprime toujours le chiffre 1 : après chaque clic, l'index 1 désigne
 * le suivant — la boucle s'arrête quand plus aucun bouton n'existe.
 */
async function clearAllStats(page: Page) {
  // Limite défensive (MAX_STATS = 4 côté UI) pour éviter une boucle infinie.
  for (let i = 0; i < 10; i++) {
    const btn = page.getByLabel("Supprimer le chiffre 1");
    if (!(await btn.isVisible().catch(() => false))) break;
    await btn.click();
  }
}

test.describe("Admin — Paramètres contenu", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // Cette suite modifie textes + storyStats. On restaure l'état seedé pour ne
  // pas casser les tests publics qui dépendent des valeurs canoniques
  // (ex. classic-sections : #chiffres-cles attend 4 stats spécifiques).
  test.afterAll(async () => {
    await resetTenantContentSeed();
  });

  // ─── Happy path ─────────────────────────────────────────────────────────────

  test("l'onglet Contenu est visible et accessible", async ({ page }) => {
    await page.goto("/admin/parametres?tab=content");
    await expect(
      page.getByRole("heading", { name: "Hero — Textes", level: 2 }),
    ).toBeVisible();
    await expect(page.locator('[name="heroEyebrow"]')).toBeVisible();
    await expect(page.locator('[name="heroTitle"]')).toBeVisible();
    await expect(page.locator('[name="heroSubtitle"]')).toBeVisible();
    await expect(page.locator('[name="storyTitle"]')).toBeVisible();
    await expect(page.locator('[name="footerTagline"]')).toBeVisible();
  });

  test("modifier le titre du hero le persiste et l'affiche sur la homepage", async ({ page }) => {
    const heroTitle = `Titre Hero ${RUN_ID}`;

    await page.goto("/admin/parametres?tab=content");
    await page.waitForLoadState("networkidle");

    await page.locator('[name="heroTitle"]').fill(heroTitle);
    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect(page.getByText("Contenu mis à jour")).toBeVisible({ timeout: 10000 });

    // Persistance après reload
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[name="heroTitle"]')).toHaveValue(heroTitle);

    // Visible sur la homepage
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: heroTitle, level: 1 }),
    ).toBeVisible();
  });

  test("modifier les textes du bloc 'Notre histoire' les affiche sur la homepage", async ({ page }) => {
    const storyEyebrow = `Eyebrow ${RUN_ID}`;
    const storyTitle = `Notre Histoire ${RUN_ID}`;
    const storyText = `Une histoire unique racontée pour le run ${RUN_ID}.`;

    await page.goto("/admin/parametres?tab=content");
    await page.waitForLoadState("networkidle");

    await page.locator('[name="storyEyebrow"]').fill(storyEyebrow);
    await page.locator('[name="storyTitle"]').fill(storyTitle);
    await page.locator('[name="storyText"]').fill(storyText);

    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Contenu mis à jour")).toBeVisible({ timeout: 10000 });

    await page.goto("/");
    await expect(page.getByText(storyEyebrow)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: storyTitle, level: 2 }),
    ).toBeVisible();
    await expect(page.getByText(storyText)).toBeVisible();
  });

  test("ajouter un chiffre clé l'affiche sur la homepage", async ({ page }) => {
    const statValue = "42";
    const statLabel = `Chambres ${RUN_ID}`;

    await page.goto("/admin/parametres?tab=content");
    await page.waitForLoadState("networkidle");

    // Au moins un story texte pour que la section s'affiche
    await page.locator('[name="storyTitle"]').fill(`Histoire ${RUN_ID}`);

    // Le global setup seed déjà 4 stats (= max) — il faut libérer un slot
    await clearAllStats(page);

    await page.getByRole("button", { name: "+ Ajouter un chiffre" }).click();
    await page.getByLabel("Valeur du chiffre 1").fill(statValue);
    await page.getByLabel("Libellé du chiffre 1").fill(statLabel);

    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Contenu mis à jour")).toBeVisible({ timeout: 10000 });

    await page.goto("/");
    await expect(page.getByText(statValue, { exact: true })).toBeVisible();
    await expect(page.getByText(statLabel)).toBeVisible();
  });

  test("modifier le tagline du footer l'affiche en bas de page", async ({ page }) => {
    const tagline = `L'art de recevoir ${RUN_ID}.`;

    await page.goto("/admin/parametres?tab=content");
    await page.waitForLoadState("networkidle");

    await page.locator('[name="footerTagline"]').fill(tagline);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Contenu mis à jour")).toBeVisible({ timeout: 10000 });

    await page.goto("/");
    await expect(page.locator("footer").getByText(tagline)).toBeVisible();
  });

  // ─── Cas limites ────────────────────────────────────────────────────────────

  test("sauvegarder tous les champs vides ne casse pas la homepage", async ({ page }) => {
    await page.goto("/admin/parametres?tab=content");
    await page.waitForLoadState("networkidle");

    for (const name of [
      "heroEyebrow",
      "heroTitle",
      "heroSubtitle",
      "storyEyebrow",
      "storyTitle",
      "storyText",
      "footerTagline",
    ]) {
      await page.locator(`[name="${name}"]`).fill("");
    }

    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Contenu mis à jour")).toBeVisible({ timeout: 10000 });

    // La homepage doit toujours répondre 200
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(400);
    // Le titre fallback = nom du tenant doit apparaître
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("un titre très long (200 caractères) est accepté", async ({ page }) => {
    const longTitle = `Titre ${RUN_ID} ` + "x".repeat(180);

    await page.goto("/admin/parametres?tab=content");
    await page.waitForLoadState("networkidle");

    await page.locator('[name="heroTitle"]').fill(longTitle);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Contenu mis à jour")).toBeVisible({ timeout: 10000 });
  });

  test("supprimer une stat existante la retire de la homepage", async ({ page }) => {
    const statLabel = `Temp ${RUN_ID}`;

    await page.goto("/admin/parametres?tab=content");
    await page.waitForLoadState("networkidle");

    // Garantir un texte d'histoire pour que la section soit rendue
    await page.locator('[name="storyTitle"]').fill(`Story ${RUN_ID}`);

    // Le global setup seed déjà 4 stats (= max) — il faut libérer un slot
    await clearAllStats(page);

    await page.getByRole("button", { name: "+ Ajouter un chiffre" }).click();
    await page.getByLabel("Valeur du chiffre 1").fill("7");
    await page.getByLabel("Libellé du chiffre 1").fill(statLabel);

    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Contenu mis à jour")).toBeVisible({ timeout: 10000 });

    await page.goto("/");
    await expect(page.getByText(statLabel)).toBeVisible();

    // Suppression
    await page.goto("/admin/parametres?tab=content");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Supprimer le chiffre 1").click();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Contenu mis à jour")).toBeVisible({ timeout: 10000 });

    await page.goto("/");
    await expect(page.getByText(statLabel)).not.toBeVisible();
  });

  // ─── Sécurité ───────────────────────────────────────────────────────────────

  test("XSS dans le titre du hero → script échappé, pas de dialog", async ({ page }) => {
    const xss = `<script>alert("xss-${RUN_ID}")</script>`;

    page.on("dialog", () => {
      throw new Error("Dialog XSS déclenché — le contenu n'est pas échappé");
    });

    await page.goto("/admin/parametres?tab=content");
    await page.waitForLoadState("networkidle");

    await page.locator('[name="heroTitle"]').fill(xss);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Contenu mis à jour")).toBeVisible({ timeout: 10000 });

    await page.goto("/");
    // Le texte doit apparaître échappé (sans déclencher de dialog)
    await expect(page.getByRole("heading", { level: 1, name: xss })).toBeVisible();
    await page.waitForTimeout(500);

    // Nettoyage : restaurer un titre neutre pour ne pas polluer les autres tests
    await page.goto("/admin/parametres?tab=content");
    await page.waitForLoadState("networkidle");
    await page.locator('[name="heroTitle"]').fill("");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Contenu mis à jour")).toBeVisible({ timeout: 10000 });
  });

  // Cleanup volontairement omis : chaque test utilise RUN_ID unique, et le
  // dernier test ("sauvegarder tous les champs vides…") remet déjà tous les
  // textes à zéro. Les stats résiduelles sont nettoyées par le test
  // "supprimer une stat existante…" qui supprime ce qu'il a créé.
});

// ─── Tests sans authentification (contexte isolé pour éviter le beforeEach) ──

test.describe("Admin — Paramètres contenu (sans session)", () => {
  test("accès /admin/parametres?tab=content sans session → redirige vers /login", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    try {
      await page.goto("/admin/parametres?tab=content");
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    } finally {
      await context.close();
    }
  });

  test("DELETE /api/admin/hero-photo sans session → 401/redir login", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    try {
      const res = await context.request.delete("/api/admin/hero-photo");
      expect([401, 302, 307]).toContain(res.status());
    } finally {
      await context.close();
    }
  });
});
