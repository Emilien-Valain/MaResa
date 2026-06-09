import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { cleanRules } from "../helpers/clean-rules";
import {
  insertPricingRule,
  deletePricingRule,
  insertBookingRule,
  deleteBookingRule,
} from "../helpers/intake";

/**
 * Spécification : Tests de non-régression > Résolution des règles (ADR-0009)
 * Référence : ADR-0006 (pricing), thread #3 + bug .scratch/pricing-resolution
 *
 * Pricing et booking-rules partagent UNE primitive de précédence
 * (lib/rule-precedence.ts) ; le pricing élit un scalaire, les booking-rules
 * mergent par champ. On asserte la résolution via /api/pricing et /api/rules.
 *
 * La chambre API a un prix de base de 100,00 €. cleanRules() en beforeAll garantit
 * une ardoise vierge ; chaque test nettoie ses règles.
 */

const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as { tenantId: string; apiRoomId: string };

async function nightPrice(page: Page, from: string, to: string): Promise<number> {
  const res = await page.request.get("/api/pricing", {
    params: { roomId: ctx.apiRoomId, tenantId: ctx.tenantId, from, to },
  });
  expect(res.ok()).toBe(true);
  const body = await res.json();
  return body.nights[0].price as number;
}

async function effectiveRules(page: Page, checkIn = "2027-05-03") {
  const res = await page.request.get("/api/rules", {
    params: { roomId: ctx.apiRoomId, tenantId: ctx.tenantId, checkIn },
  });
  expect(res.ok()).toBe(true);
  return res.json();
}

// IP dédiée : budget de rate-limit propre à ce fichier (cf. holds.spec).
test.use({ extraHTTPHeaders: { "x-forwarded-for": "10.10.0.4" } });

test.describe("Résolution des règles — précédence partagée (ADR-0009)", () => {
  test.beforeAll(async () => {
    await cleanRules(ctx.tenantId);
  });
  test.afterEach(async () => {
    await cleanRules(ctx.tenantId);
  });

  // ─── Pricing (corrige .scratch/pricing-resolution) ────────────────────────────

  test("une promo (% négatif) est réellement facturée, sous le prix de base", async ({ page }) => {
    // -30 % global toute-l'année sur base 100 → 70
    const ruleId = await insertPricingRule({
      tenantId: ctx.tenantId,
      name: "Promo -30",
      percentageModifier: "-30.00",
    });
    try {
      expect(await nightPrice(page, "2027-05-01", "2027-05-02")).toBe(70);
    } finally {
      await deletePricingRule(ruleId);
    }
  });

  test("la priorité casse l'égalité — pas « le prix le plus haut gagne »", async ({ page }) => {
    // Deux globales toute-l'année, même spécificité : la plus prioritaire gagne
    // même si son montant est plus bas (réfute highest-wins).
    const high = await insertPricingRule({
      tenantId: ctx.tenantId, name: "Basse mais prioritaire", fixedPrice: "80.00", priority: 5,
    });
    const low = await insertPricingRule({
      tenantId: ctx.tenantId, name: "Haute mais non prioritaire", fixedPrice: "200.00", priority: 0,
    });
    try {
      expect(await nightPrice(page, "2027-05-01", "2027-05-02")).toBe(80);
    } finally {
      await deletePricingRule(high);
      await deletePricingRule(low);
    }
  });

  test("une règle chambre l'emporte sur une globale à priorité égale (spécificité)", async ({ page }) => {
    const global = await insertPricingRule({
      tenantId: ctx.tenantId, name: "Globale", fixedPrice: "200.00", priority: 0,
    });
    const room = await insertPricingRule({
      tenantId: ctx.tenantId, roomId: ctx.apiRoomId, name: "Chambre", fixedPrice: "90.00", priority: 0,
    });
    try {
      expect(await nightPrice(page, "2027-05-01", "2027-05-02")).toBe(90);
    } finally {
      await deletePricingRule(global);
      await deletePricingRule(room);
    }
  });

  test("« à partir de X€ » == prix réellement facturé (display == charge)", async ({ page }) => {
    const ruleId = await insertPricingRule({
      tenantId: ctx.tenantId, name: "Promo -30", percentageModifier: "-30.00",
    });
    try {
      // Affiché : minPricePerNight via /api/rooms/available (dérivé du résolveur).
      const res = await page.request.get("/api/rooms/available", {
        params: { tenantId: ctx.tenantId, from: "2027-05-01", to: "2027-05-02" },
      });
      const body = await res.json();
      const room = body.rooms.find((r: { id: string }) => r.id === ctx.apiRoomId);
      expect(room).toBeTruthy();
      const display = room.minPricePerNight as number;

      // Facturé : prix de la nuit via /api/pricing.
      const charge = await nightPrice(page, "2027-05-01", "2027-05-02");

      // L'ancien code affichait 70 mais facturait 100 (le bug). Les deux doivent
      // être égaux ET valoir la promo.
      expect(display).toBe(70);
      expect(charge).toBe(70);
      expect(display).toBe(charge);
    } finally {
      await deletePricingRule(ruleId);
    }
  });

  // ─── Booking-rules : merge par champ (corrige thread #3) ──────────────────────

  test("une règle chambre minStay n'efface pas les allowedCheckInDays globaux", async ({ page }) => {
    // Global : minStay 2 + arrivée Ven/Sam ; Chambre : minStay 3 seulement.
    const global = await insertBookingRule({
      tenantId: ctx.tenantId, minStay: 2, allowedCheckInDays: [5, 6],
    });
    const room = await insertBookingRule({
      tenantId: ctx.tenantId, roomId: ctx.apiRoomId, minStay: 3,
    });
    try {
      const rules = await effectiveRules(page);
      expect(rules.minStay).toBe(3); // chambre gagne sur ce champ
      expect(rules.allowedCheckInDays).toEqual([5, 6]); // hérité du global (plus d'override de bloc)
    } finally {
      await deleteBookingRule(global);
      await deleteBookingRule(room);
    }
  });

  test("booking-rules : priority-first — une annuelle prioritaire bat une saisonnière", async ({ page }) => {
    // checkIn de test = 2027-05-03. Règle saisonnière (mai 2027) minStay 2, priorité 0
    // VS règle annuelle minStay 9, priorité 5.
    // Ancien tri (saisonnière-first) → élit la saisonnière → minStay 2.
    // Nouveau (priority-first, ADR-0009) → élit l'annuelle prioritaire → minStay 9.
    const seasonalLowPrio = await insertBookingRule({
      tenantId: ctx.tenantId,
      minStay: 2,
      priority: 0,
      validFrom: new Date("2027-05-01T00:00:00.000Z"),
      validTo: new Date("2027-05-31T00:00:00.000Z"),
    });
    const allYearHighPrio = await insertBookingRule({
      tenantId: ctx.tenantId, minStay: 9, priority: 5,
    });
    try {
      const rules = await effectiveRules(page); // checkIn 2027-05-03
      expect(rules.minStay).toBe(9);
    } finally {
      await deleteBookingRule(seasonalLowPrio);
      await deleteBookingRule(allYearHighPrio);
    }
  });
});
