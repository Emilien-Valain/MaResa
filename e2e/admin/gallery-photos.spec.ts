import { test, expect, type Page } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Admin > Galerie d'illustration
 *
 * Source de vérité : `Tests de non-régression.md` — section Admin / Galerie
 *
 * Couvre :
 *   - upload + suppression de photos (0 à 6, la page d'accueil s'adapte)
 *   - persistance des légendes
 *   - rendu adaptatif sur la homepage (1, 3, 6 photos)
 *   - rejet d'un mime non supporté
 *   - isolation : DELETE sans session → 401/302
 */

const RUN_ID = `R${Date.now().toString(36).slice(-6)}`;

// Petite image PNG valide (1×1 px transparent) — utilisée pour tous les uploads.
// Suffisant pour franchir la validation sharp/mime sans alourdir le repo.
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const tinyPng = () => Buffer.from(TINY_PNG_B64, "base64");

async function clearAllPhotos(page: Page) {
  await page.goto("/admin/parametres?tab=content");
  await page.waitForLoadState("networkidle");
  // Supprime toutes les vignettes en cliquant sur la croix de chacune
  while (true) {
    const items = page.getByTestId("gallery-photo-item");
    if ((await items.count()) === 0) break;
    const btn = items.first().getByRole("button", { name: /Supprimer la photo/i });
    await btn.click({ force: true });
    // attendre que la liste se mette à jour
    await page.waitForTimeout(200);
  }
}

async function uploadPhotos(page: Page, n: number) {
  const input = page.getByTestId("gallery-photo-input");
  const files = Array.from({ length: n }).map((_, i) => ({
    name: `gallery-${RUN_ID}-${i}.png`,
    mimeType: "image/png",
    buffer: tinyPng(),
  }));
  // Le POST passe par sharp + revalidatePath — sur dev server à froid ça peut
  // dépasser largement les 15s. On attend la réponse explicitement avant de
  // poller le DOM, plutôt que de courir contre un timeout fixe.
  const responsePromise = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/admin/gallery-photos") &&
      r.request().method() === "POST",
    { timeout: 30_000 },
  );
  await input.setInputFiles(files);
  const res = await responsePromise;
  if (!res.ok()) {
    throw new Error(
      `Upload galerie a échoué : ${res.status()} ${await res.text()}`,
    );
  }
  await expect
    .poll(async () => page.getByTestId("gallery-photo-item").count(), {
      timeout: 5_000,
    })
    .toBe(n);
}

test.describe("Admin — Galerie d'illustration", () => {
  test.beforeEach(async ({ page }) => {
    await clearAllPhotos(page);
  });

  test.afterEach(async ({ page }) => {
    await clearAllPhotos(page);
  });

  // ─── Happy path ─────────────────────────────────────────────────────────────

  test("la section Galerie est visible dans l'onglet Contenu", async ({ page }) => {
    await page.goto("/admin/parametres?tab=content");
    await expect(
      page.getByRole("heading", { name: "Galerie d'illustration", level: 2 }),
    ).toBeVisible();
    await expect(page.getByTestId("gallery-photo-input")).toBeAttached();
  });

  test("upload d'une photo l'ajoute à la liste et la rend sur la homepage", async ({ page }) => {
    await uploadPhotos(page, 1);
    await expect(page.getByTestId("gallery-photo-item")).toHaveCount(1);

    await page.goto("/");
    const gallery = page.getByTestId("home-gallery");
    await expect(gallery).toBeVisible();
    await expect(gallery).toHaveAttribute("data-count", "1");
    await expect(gallery.locator("img")).toHaveCount(1);
  });

  test("la légende saisie est persistée et affichée sur la homepage", async ({ page }) => {
    const caption = `Façade ${RUN_ID}`;
    await uploadPhotos(page, 1);

    const captionInput = page.getByLabel("Description de la photo 1");
    await captionInput.fill(caption);
    // La sauvegarde est débouncée — on attend que le PUT parte.
    await page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/admin/gallery-photos") &&
        r.request().method() === "PUT" &&
        r.ok(),
      { timeout: 5000 },
    );

    // Persistance après reload
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByLabel("Description de la photo 1")).toHaveValue(caption);

    // Visible sur la homepage
    await page.goto("/");
    await expect(page.getByText(caption)).toBeVisible();
  });

  test("6 photos → layout grid 3×2 sur la homepage", async ({ page }) => {
    await uploadPhotos(page, 6);
    await page.goto("/");
    const gallery = page.getByTestId("home-gallery");
    await expect(gallery).toBeVisible();
    await expect(gallery).toHaveAttribute("data-count", "6");
    await expect(gallery.locator("img")).toHaveCount(6);
  });

  test("3 photos → layout 1 grande + 2 empilées", async ({ page }) => {
    await uploadPhotos(page, 3);
    await page.goto("/");
    const gallery = page.getByTestId("home-gallery");
    await expect(gallery).toHaveAttribute("data-count", "3");
    await expect(gallery.locator("img")).toHaveCount(3);
  });

  test("0 photo → la section galerie n'est pas rendue", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("home-gallery")).toHaveCount(0);
  });

  test("supprimer une photo la retire de la homepage", async ({ page }) => {
    await uploadPhotos(page, 2);
    await page.goto("/");
    await expect(page.getByTestId("home-gallery")).toHaveAttribute("data-count", "2");

    await page.goto("/admin/parametres?tab=content");
    await page.waitForLoadState("networkidle");
    await page
      .getByTestId("gallery-photo-item")
      .first()
      .getByRole("button", { name: /Supprimer la photo/i })
      .click({ force: true });

    await expect.poll(async () => page.getByTestId("gallery-photo-item").count()).toBe(1);

    await page.goto("/");
    await expect(page.getByTestId("home-gallery")).toHaveAttribute("data-count", "1");
  });

  // ─── Cas limites ────────────────────────────────────────────────────────────

  test("au-delà de 6 photos, l'upload renvoie une erreur (limite max)", async ({ page }) => {
    await uploadPhotos(page, 6);
    // Le dropzone d'upload n'est plus rendu quand on est au max
    await expect(page.getByTestId("gallery-photo-input")).toHaveCount(0);

    // Tentative directe via l'API (mime ok mais quota dépassé)
    const res = await page.request.post("/api/admin/gallery-photos", {
      multipart: {
        photos: { name: "extra.png", mimeType: "image/png", buffer: tinyPng() },
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Maximum 6/i);
  });

  test("légende > 80 caractères est tronquée côté serveur", async ({ page }) => {
    await uploadPhotos(page, 1);
    const long = "A".repeat(120);

    await page.getByLabel("Description de la photo 1").fill(long);
    await page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/admin/gallery-photos") &&
        r.request().method() === "PUT" &&
        r.ok(),
      { timeout: 5000 },
    );

    await page.reload();
    await page.waitForLoadState("networkidle");
    const persisted = await page.getByLabel("Description de la photo 1").inputValue();
    expect(persisted.length).toBeLessThanOrEqual(80);
  });

  // ─── Sécurité ───────────────────────────────────────────────────────────────

  test("XSS dans une légende → texte affiché échappé, pas de dialog", async ({ page }) => {
    const xss = `<script>alert("g-${RUN_ID}")</script>`;
    page.on("dialog", () => {
      throw new Error("Dialog XSS déclenché — légende non échappée");
    });

    await uploadPhotos(page, 1);
    await page.getByLabel("Description de la photo 1").fill(xss);
    await page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/admin/gallery-photos") &&
        r.request().method() === "PUT" &&
        r.ok(),
      { timeout: 5000 },
    );

    await page.goto("/");
    // Le texte doit être affiché tel quel (échappé) sur la homepage
    await expect(page.getByText(xss)).toBeVisible();
    await page.waitForTimeout(300);
  });

  test("mime non supporté est rejeté", async ({ page }) => {
    await page.goto("/admin/parametres?tab=content");
    await page.waitForLoadState("networkidle");

    const res = await page.request.post("/api/admin/gallery-photos", {
      multipart: {
        photos: {
          name: "fake.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("not an image"),
        },
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Type non supporté/i);
  });
});

// ─── Tests sans authentification (contexte isolé) ───────────────────────────

test.describe("Admin — Galerie (sans session)", () => {
  test("POST /api/admin/gallery-photos sans session → 401/302", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      const res = await context.request.post("/api/admin/gallery-photos", {
        multipart: {
          photos: { name: "x.png", mimeType: "image/png", buffer: tinyPng() },
        },
      });
      expect([401, 302, 307]).toContain(res.status());
    } finally {
      await context.close();
    }
  });

  test("DELETE /api/admin/gallery-photos sans session → 401/302", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      const res = await context.request.delete("/api/admin/gallery-photos", {
        data: { photoId: "00000000-0000-0000-0000-000000000000" },
      });
      expect([401, 302, 307]).toContain(res.status());
    } finally {
      await context.close();
    }
  });
});
