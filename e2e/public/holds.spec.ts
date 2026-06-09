import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { cleanRules } from "../helpers/clean-rules";
import { insertManualBlock, deleteManualBlock } from "../helpers/manual-blocks";

/**
 * Spécification : Tests de non-régression > API > Disponibilité (module Hold)
 * Référence Obsidian : Phase 3.1 — Logique de disponibilité / ADR-0007
 *
 * Couvre les trois défauts corrigés par l'unification sur le seam `blockedDates`
 * (lib/holds.ts) :
 *  - Bug B : un blocage récurrent scopé chambre était ignoré par
 *    getAvailableRooms (n'était checké que si un blocage global existait).
 *  - recurrenceUntil EXCLUSIF : une date == recurrenceUntil ne doit pas être bloquée.
 *  - Point C (ADR-0004) : l'export iCal doit ré-exporter les manual blocks,
 *    pas seulement les bookings.
 *
 * Chaque test seede ses propres blocages et les nettoie (aucun résidu en DB).
 * Les fenêtres sont choisies en août/septembre 2026 pour ne pas chevaucher la
 * réservation seedée (10→15 juin) ni le blocage iCal seedé (20→23 juin).
 */

const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as {
  tenantId: string;
  apiRoomId: string;
};

/** "2026-08-03" -> "20260803" (format DTSTART;VALUE=DATE de l'export iCal). */
const ymd = (iso: string) => iso.replace(/-/g, "");
/** Jour de semaine UTC (0 = dimanche) d'une date ISO. */
const weekday = (iso: string) => new Date(iso + "T00:00:00.000Z").getUTCDay();
const addDaysIso = (date: Date, days: number) =>
  new Date(date.getTime() + days * 86_400_000).toISOString().slice(0, 10);

function availabilityUrl(from: string, to: string) {
  const q = new URLSearchParams({ roomId: ctx.apiRoomId, tenantId: ctx.tenantId, from, to });
  return `/api/availability?${q.toString()}`;
}

function availableRoomsUrl(from: string, to: string) {
  const q = new URLSearchParams({ tenantId: ctx.tenantId, from, to });
  return `/api/rooms/available?${q.toString()}`;
}

test.describe("API — Module Hold (disponibilité unifiée)", () => {
  test.beforeAll(async () => {
    await cleanRules(ctx.tenantId);
  });

  // ─── Bug B : blocage récurrent scopé chambre exclu de getAvailableRooms ───────

  test("un blocage récurrent scopé chambre exclut la chambre de /api/rooms/available", async ({ page }) => {
    // Lundi 3 août 2026, une nuit, hors des dates seedées (juin)
    const from = "2026-08-03";
    const to = "2026-08-04";

    // Contrôle positif : sans blocage, la chambre API est disponible
    const before = await (await page.request.get(availableRoomsUrl(from, to))).json();
    expect(before.rooms.some((r: { id: string }) => r.id === ctx.apiRoomId)).toBe(true);

    // Blocage récurrent hebdo CE jour de semaine, scopé chambre, SANS blocage global.
    // C'est précisément le cas que getAvailableRooms ignorait avant le fix.
    const blockId = await insertManualBlock({
      tenantId: ctx.tenantId,
      roomId: ctx.apiRoomId,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-01-01T00:00:00.000Z"), // ignoré (recurring)
      recurring: true,
      recurrenceType: "weekly",
      recurrenceDays: [weekday(from)],
      recurrenceUntil: null, // ouvert
    });

    try {
      const after = await (await page.request.get(availableRoomsUrl(from, to))).json();
      expect(after.rooms.some((r: { id: string }) => r.id === ctx.apiRoomId)).toBe(false);

      // Cohérence avec le check unitaire isRoomAvailable (même seam)
      const avail = await (await page.request.get(availabilityUrl(from, to))).json();
      expect(avail.available).toBe(false);
      expect(avail.blockedDates).toContain(from);
    } finally {
      await deleteManualBlock(blockId);
    }

    // Nettoyage vérifié : la chambre redevient disponible
    const restored = await (await page.request.get(availableRoomsUrl(from, to))).json();
    expect(restored.rooms.some((r: { id: string }) => r.id === ctx.apiRoomId)).toBe(true);
  });

  test("un blocage récurrent sur un AUTRE jour n'exclut pas la chambre", async ({ page }) => {
    const from = "2026-08-03"; // lundi
    const to = "2026-08-04";
    const otherDay = (weekday(from) + 3) % 7; // un jour différent

    const blockId = await insertManualBlock({
      tenantId: ctx.tenantId,
      roomId: ctx.apiRoomId,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-01-01T00:00:00.000Z"),
      recurring: true,
      recurrenceType: "weekly",
      recurrenceDays: [otherDay],
      recurrenceUntil: null,
    });

    try {
      const res = await (await page.request.get(availableRoomsUrl(from, to))).json();
      expect(res.rooms.some((r: { id: string }) => r.id === ctx.apiRoomId)).toBe(true);
    } finally {
      await deleteManualBlock(blockId);
    }
  });

  // ─── recurrenceUntil EXCLUSIF ─────────────────────────────────────────────────

  test("recurrenceUntil est exclusif : la date == recurrenceUntil n'est pas bloquée", async ({ page }) => {
    // D et D-7 tombent le même jour de semaine ; recurrenceUntil = D
    const until = "2026-09-07"; // lundi
    const prevMatch = "2026-08-31"; // lundi précédent, < until

    const blockId = await insertManualBlock({
      tenantId: ctx.tenantId,
      roomId: ctx.apiRoomId,
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      endDate: new Date("2026-08-01T00:00:00.000Z"),
      recurring: true,
      recurrenceType: "weekly",
      recurrenceDays: [weekday(until)],
      recurrenceUntil: new Date(until + "T00:00:00.000Z"),
    });

    try {
      // La date == recurrenceUntil doit être LIBRE (borne exclusive)
      const atUntil = await (await page.request.get(availabilityUrl(until, "2026-09-08"))).json();
      expect(atUntil.available).toBe(true);
      expect(atUntil.blockedDates).toEqual([]);

      // L'occurrence précédente (< until) doit être bloquée
      const before = await (await page.request.get(availabilityUrl(prevMatch, "2026-09-01"))).json();
      expect(before.available).toBe(false);
      expect(before.blockedDates).toContain(prevMatch);
    } finally {
      await deleteManualBlock(blockId);
    }
  });

  // ─── Point C : l'export iCal ré-exporte les manual blocks (ADR-0004) ──────────

  test("GET /api/ical/[roomId] ré-exporte les blocages manuels, pas seulement les bookings", async ({ page }) => {
    // Bloc ponctuel placé dans l'horizon forward (now+60j) pour être déterministe
    // quelle que soit la date d'exécution, et hors des dates seedées.
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    const startIso = addDaysIso(now, 60);
    const endIso = addDaysIso(now, 63); // 3 nuits

    const blockId = await insertManualBlock({
      tenantId: ctx.tenantId,
      roomId: ctx.apiRoomId,
      startDate: new Date(startIso + "T00:00:00.000Z"),
      endDate: new Date(endIso + "T00:00:00.000Z"),
      recurring: false,
    });

    try {
      const res = await page.request.get(`/api/ical/${ctx.apiRoomId}`);
      expect(res.status()).toBe(200);
      const ics = await res.text();
      // Avant le fix : seuls les bookings étaient exportés → ces lignes absentes.
      expect(ics).toContain(`DTSTART;VALUE=DATE:${ymd(startIso)}`);
      expect(ics).toContain(`DTEND;VALUE=DATE:${ymd(endIso)}`);
    } finally {
      await deleteManualBlock(blockId);
    }

    // Nettoyage vérifié : les dates disparaissent de l'export
    const after = await (await page.request.get(`/api/ical/${ctx.apiRoomId}`)).text();
    expect(after).not.toContain(`DTSTART;VALUE=DATE:${ymd(startIso)}`);
  });

  test("GET /api/ical/[roomId] retourne 404 pour une chambre inexistante", async ({ page }) => {
    const res = await page.request.get("/api/ical/00000000-0000-0000-0000-000000000000");
    expect(res.status()).toBe(404);
  });
});
