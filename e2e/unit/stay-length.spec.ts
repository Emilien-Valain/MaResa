import { test, expect } from "@playwright/test";
import { bookingManualSchema, bookingPublicSchema, STAY_TOO_LONG_MESSAGE } from "../../lib/validation";
import { parisToday } from "../../lib/date-windows";

/**
 * Régression `.scratch/audit-2026-10/issues/02` : un séjour > 366 nuits est
 * refusé par les schémas de réservation (public et manuel). Testé ici plutôt
 * qu'en E2E : côté public, l'échec Stripe supprime de toute façon le pending,
 * donc « aucune résa créée » ne prouve pas que le schéma a refusé.
 */

const base = {
  roomId: "00000000-0000-4000-8000-000000000000",
  guestName: "Test",
  guestEmail: "t@example.com",
  guestCount: "1",
  checkIn: "2027-01-04",
};
const plus = (n: number) =>
  new Date(Date.parse("2027-01-04T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);

for (const [name, schema] of [
  ["public", bookingPublicSchema],
  ["manuel", bookingManualSchema],
] as const) {
  test(`${name} : 366 nuits acceptées, 367 refusées, 2 ans refusés`, () => {
    expect(schema.safeParse({ ...base, checkOut: plus(366) }).success).toBe(true);
    for (const n of [367, 730]) {
      const r = schema.safeParse({ ...base, checkOut: plus(n) });
      expect(r.success).toBe(false);
      expect(r.error?.issues.map((i) => i.message)).toContain(STAY_TOO_LONG_MESSAGE);
    }
  });
}

// Audit 2026-10/05 : arrivée passée refusée côté public (aujourd'hui = date à Paris), acceptée côté manuel.
test("public : arrivée aujourd'hui acceptée, hier refusée ; manuel : hier accepté", () => {
  const today = parisToday();
  const day = (iso: string, n: number) =>
    new Date(Date.parse(iso + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
  const yesterday = day(today, -1);

  expect(bookingPublicSchema.safeParse({ ...base, checkIn: today, checkOut: day(today, 1) }).success).toBe(true);
  const past = bookingPublicSchema.safeParse({ ...base, checkIn: yesterday, checkOut: today });
  expect(past.success).toBe(false);
  expect(past.error?.issues.map((i) => i.message)).toContain("La date d'arrivée est déjà passée");
  expect(bookingManualSchema.safeParse({ ...base, checkIn: yesterday, checkOut: today }).success).toBe(true);
});
