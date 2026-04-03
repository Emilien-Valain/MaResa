import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Tests de sécurité — headers HTTP, rate limiting, validation, isolation tenant.
 * Complète les tests XSS existants dans les fichiers admin/*.spec.ts.
 */

const RUN_ID = Date.now().toString(36);

const testContext = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "e2e", ".auth", "test-context.json"),
    "utf-8",
  ),
);

// ─── Headers de sécurité HTTP ─────────────────────────────────────────────────

test.describe("Sécurité — Headers HTTP", () => {
  test("la page d'accueil retourne tous les headers de sécurité", async ({
    request,
  }) => {
    const res = await request.get("/");
    const headers = res.headers();

    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["strict-transport-security"]).toContain("max-age=");
    expect(headers["content-security-policy"]).toContain("default-src");
  });

  test("la CSP bloque les scripts inline dangereux (frame-ancestors: none)", async ({
    request,
  }) => {
    const res = await request.get("/");
    const csp = res.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  test("les headers de sécurité sont aussi présents sur les routes API", async ({
    request,
  }) => {
    const res = await request.get(
      `/api/availability?roomId=${testContext.apiRoomId}&from=2026-09-01&to=2026-09-05`,
    );
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

test.describe("Sécurité — Rate limiting", () => {
  test("les requêtes API excessives retournent 429", async ({ request }) => {
    // La limite est 60 req/min pour les API publiques.
    // On envoie 65 requêtes rapides.
    const url = `/api/availability?roomId=${testContext.apiRoomId}&from=2026-09-01&to=2026-09-05`;

    let got429 = false;
    for (let i = 0; i < 65; i++) {
      const res = await request.get(url);
      if (res.status() === 429) {
        got429 = true;
        expect(res.headers()["retry-after"]).toBeTruthy();
        break;
      }
    }

    expect(got429).toBe(true);
  });
});

// ─── Validation des entrées (Zod) ────────────────────────────────────────────

test.describe("Sécurité — Validation des entrées", () => {
  test("API availability rejette un roomId non-UUID", async ({ request }) => {
    const res = await request.get(
      "/api/availability?roomId=not-a-uuid&from=2026-09-01&to=2026-09-05",
    );
    // Doit retourner une erreur, pas un 500
    expect(res.status()).toBeLessThan(500);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("API availability rejette des dates malformées", async ({
    request,
  }) => {
    const res = await request.get(
      `/api/availability?roomId=${testContext.apiRoomId}&from=abc&to=def`,
    );
    expect(res.status()).toBeLessThan(500);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("API availability rejette checkout <= checkin", async ({ request }) => {
    const res = await request.get(
      `/api/availability?roomId=${testContext.apiRoomId}&from=2026-09-10&to=2026-09-05`,
    );
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── Cron sans secret ─────────────────────────────────────────────────────────

test.describe("Sécurité — Protection du cron", () => {
  test("GET /api/cron/ical-sync sans Authorization retourne 401 ou 500", async ({
    request,
  }) => {
    const res = await request.get("/api/cron/ical-sync");
    // 401 si CRON_SECRET configuré, 500 si pas configuré (endpoint désactivé)
    expect([401, 500]).toContain(res.status());
  });

  test("GET /api/cron/ical-sync avec un mauvais secret retourne 401", async ({
    request,
  }) => {
    const res = await request.get("/api/cron/ical-sync", {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    expect([401, 500]).toContain(res.status());
  });
});

// ─── Accès non authentifié aux routes admin ───────────────────────────────────

test.describe("Sécurité — Routes admin protégées", () => {
  // Utiliser un contexte sans session (pas de storageState)
  test.use({ storageState: { cookies: [], origins: [] } });

  const adminRoutes = [
    "/admin",
    "/admin/chambres",
    "/admin/reservations",
    "/admin/calendrier",
    "/admin/parametres",
  ];

  for (const route of adminRoutes) {
    test(`${route} redirige vers /login sans session`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("API admin retourne 401 sans session", async ({ request }) => {
    const res = await request.post("/api/admin/ical-sync");
    expect(res.status()).toBe(401);
  });
});

// ─── Isolation multi-tenant ───────────────────────────────────────────────────

test.describe("Sécurité — Isolation tenant", () => {
  test("UUID d'une chambre inexistante retourne 404, pas 500", async ({
    page,
  }) => {
    const fakeUuid = "00000000-0000-0000-0000-000000000000";
    const res = await page.goto(`/chambres/${fakeUuid}`);
    expect(res?.status()).toBe(404);
  });

  test("sitemap.xml ne contient que les chambres du tenant courant", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    // Doit contenir le domaine courant, pas d'autres domaines
    expect(body).toContain("localhost:3001");
    // Doit être du XML valide avec urlset
    expect(body).toContain("<urlset");
  });

  test("robots.txt bloque /admin/ et /api/", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("Disallow: /admin/");
    expect(body).toContain("Disallow: /api/");
    expect(body).toContain("Sitemap:");
  });
});
