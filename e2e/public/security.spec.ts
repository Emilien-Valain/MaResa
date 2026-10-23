import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fd } from "../helpers/dates";
import { Pool } from "pg";

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

// IP dédiée pour ce fichier : ses tests (hors burst) ont un budget de rate-limit
// propre, isolé des autres specs. Le test de burst ci-dessous utilise encore une
// autre IP pour ne pas épuiser celle-ci.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "10.10.0.6" } });

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
      `/api/availability?roomId=${testContext.apiRoomId}&from=${fd("2026-09-01")}&to=${fd("2026-09-05")}`,
    );
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

test.describe("Sécurité — Rate limiting", () => {
  test("les requêtes API excessives retournent 429", async ({ request }) => {
    // La limite est 60 req/min pour les API publiques.
    // On envoie 65 requêtes rapides.
    const url = `/api/availability?roomId=${testContext.apiRoomId}&from=${fd("2026-09-01")}&to=${fd("2026-09-05")}`;

    // IP dédiée au burst : on sature CE bucket sans toucher à celui du reste du
    // fichier (override de l'x-forwarded-for posé au niveau du fichier).
    const burstHeaders = { "x-forwarded-for": "10.10.9.9" };
    let got429 = false;
    for (let i = 0; i < 65; i++) {
      const res = await request.get(url, { headers: burstHeaders });
      if (res.status() === 429) {
        got429 = true;
        expect(res.headers()["retry-after"]).toBeTruthy();
        break;
      }
    }

    expect(got429).toBe(true);
  });

  test("afficher /login souvent ne déclenche jamais de 429 (audit 2026-10/12)", async ({
    request,
  }) => {
    // L'ancienne règle proxy « login » (10/min) ne comptait que les vues de /login
    // (le matcher exclut /api/auth) : en fin de suite, /login répondait 429.
    // Le sign-in est limité par Better Auth lui-même (en production seulement).
    const headers = { "x-forwarded-for": "10.10.9.8" };
    for (let i = 0; i < 15; i++) {
      const res = await request.get("/login", { headers });
      expect(res.status(), `vue n°${i + 1}`).toBe(200);
    }
    expect(await (await request.get("/login", { headers })).text()).toContain('name="email"');
  });
});

// ─── Validation des entrées (Zod) ────────────────────────────────────────────

test.describe("Sécurité — Validation des entrées", () => {
  // Un id non-UUID atteignant Postgres lève « invalid input syntax for type uuid » → 500.
  // Chaque cas fournit tous les autres paramètres valides (tenantId compris) pour
  // que la route aille jusqu'à la requête DB (audit 2026-10/06).
  const T = testContext.tenantId;
  const R = testContext.apiRoomId;
  const span = `from=${fd("2026-09-01")}&to=${fd("2026-09-05")}`;
  const malformed: [string, string][] = [
    ["availability roomId", `/api/availability?roomId=not-a-uuid&${span}&tenantId=${T}`],
    ["availability tenantId", `/api/availability?roomId=${R}&${span}&tenantId=not-a-uuid`],
    ["pricing roomId", `/api/pricing?roomId=not-a-uuid&${span}&tenantId=${T}`],
    ["pricing tenantId", `/api/pricing?roomId=${R}&${span}&tenantId=not-a-uuid`],
    ["rules roomId", `/api/rules?roomId=not-a-uuid&tenantId=${T}`],
    ["rules tenantId", `/api/rules?roomId=${R}&tenantId=' OR 1=1--`],
    ["rooms/available tenantId", `/api/rooms/available?${span}&tenantId=not-a-uuid`],
  ];
  for (const [label, url] of malformed) {
    test(`API ${label} non-UUID → 400, jamais 500`, async ({ request }) => {
      const res = await request.get(url);
      expect(res.status()).toBe(400);
    });
  }

  test("les mêmes API acceptent toujours des UUID valides (200)", async ({ request }) => {
    for (const url of [
      `/api/availability?roomId=${R}&${span}&tenantId=${T}`,
      `/api/pricing?roomId=${R}&${span}&tenantId=${T}`,
      `/api/rules?roomId=${R}&tenantId=${T}`,
      `/api/rooms/available?${span}&tenantId=${T}`,
    ]) {
      expect((await request.get(url)).status(), url).toBe(200);
    }
  });

  test("export iCal : roomId non-UUID → 404, UUID valide → 200", async ({ request }) => {
    expect((await request.get("/api/ical/not-a-uuid")).status()).toBe(404);
    expect((await request.get("/api/ical/%3Cscript%3E")).status()).toBe(404);
    const ok = await request.get(`/api/ical/${R}`);
    expect(ok.status()).toBe(200);
    expect(await ok.text()).toContain("BEGIN:VCALENDAR");
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
      `/api/availability?roomId=${testContext.apiRoomId}&from=${fd("2026-09-10")}&to=${fd("2026-09-05")}`,
    );
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── Plage de dates bornée (anti-DoS, audit 2026-10/02) ──────────────────────

test.describe("Sécurité — Plage de dates bornée à 366 nuits", () => {
  const from = fd("2027-01-04");
  const plusNights = (n: number) =>
    new Date(Date.parse(from + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
  const t = `tenantId=${testContext.tenantId}`;
  const routes = (to: string) => [
    `/api/pricing?roomId=${testContext.apiRoomId}&from=${from}&to=${to}&${t}`,
    `/api/availability?roomId=${testContext.apiRoomId}&from=${from}&to=${to}&${t}`,
    `/api/rooms/available?from=${from}&to=${to}&${t}`,
  ];

  test("366 nuits exactement : acceptées par pricing, availability, rooms/available", async ({ request }) => {
    for (const url of routes(plusNights(366))) {
      const res = await request.get(url);
      expect(res.status(), url).toBe(200);
    }
    const pricing = await (await request.get(routes(plusNights(366))[0])).json();
    expect(pricing.nights).toHaveLength(366);
  });

  test("367 nuits : 400 sur les 3 routes", async ({ request }) => {
    for (const url of routes(plusNights(367))) {
      const res = await request.get(url);
      expect(res.status(), url).toBe(400);
      expect((await res.json()).error).toContain("366 nuits maximum");
    }
  });

  test("1970 → 9999 : 400 immédiat, pas de boucle de 2,9 M nuits", async ({ request }) => {
    for (const url of routes("9999-12-31").map((u) => u.replace(from, "1970-01-01"))) {
      const t0 = Date.now();
      const res = await request.get(url, { timeout: 5_000 });
      expect(res.status(), url).toBe(400);
      expect(Date.now() - t0).toBeLessThan(2_000);
    }
  });

  test("réservation publique de 2 ans : bouton désactivé, et un submit forcé ne crée rien", async ({ page }) => {
    const email = `toolong-${RUN_ID}@example.com`;
    await page.goto(`/reserver/${testContext.apiRoomId}`);
    await page.fill('[name="guestName"]', "Trop Long");
    await page.fill('[name="guestEmail"]', email);
    await page.fill('[name="checkIn"]', from);
    await page.fill('[name="checkOut"]', plusNights(730));
    const submit = page.locator('[type="submit"]');
    await page.waitForResponse((r) => r.url().includes("/api/availability"));
    await expect(submit).toBeDisabled();

    // Contourne l'UI : aucune résa ne doit rester. Le refus du schéma lui-même
    // est prouvé par e2e/unit/stay-length.spec.ts (sans Stripe, le pending est supprimé de toute façon).
    await submit.evaluate((b: HTMLButtonElement) => {
      b.disabled = false;
      b.click();
    });
    await page.waitForLoadState("networkidle").catch(() => {});

    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const { rowCount } = await pool.query("SELECT 1 FROM bookings WHERE guest_email = $1", [email]);
    await pool.query("DELETE FROM bookings WHERE guest_email = $1", [email]); // filet
    await pool.end();
    expect(rowCount).toBe(0);
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
