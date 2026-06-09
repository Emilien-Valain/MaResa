import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * Régression `.scratch/timezone-dates/issues/01` : les bornes de dates des KPI
 * du dashboard (`lib/date-windows.ts`) doivent être identiques quel que soit le
 * `TZ` du serveur, car les dates domaine sont stockées en UTC minuit (ADR-0005).
 *
 * On exécute la même sonde sous `TZ=UTC` et `TZ=Europe/Paris` (offset non nul)
 * et on vérifie que les bornes — et le bucketing d'une réservation proche de
 * minuit en fin de mois — sont strictement identiques.
 */

const probe = path.join(__dirname, "date-windows-probe.ts");

function runProbe(tz: string) {
  const out = execFileSync("npx", ["tsx", probe], {
    env: { ...process.env, TZ: tz },
    encoding: "utf8",
  });
  return JSON.parse(out);
}

const expected = {
  todayStart: "2026-01-15T00:00:00.000Z",
  tomorrowStart: "2026-01-16T00:00:00.000Z",
  startOfWeek: "2026-01-12T00:00:00.000Z", // lundi de la semaine du 15 jan
  startOfMonth: "2026-01-01T00:00:00.000Z",
  endOfMonth: "2026-01-31T23:59:59.999Z",
  bookingInMonth: true, // résa du 31 jan 23:30 UTC dans le bucket de janvier
};

test.describe("Fenêtres de dates KPI — indépendantes du TZ", () => {
  test("UTC et Europe/Paris produisent des bornes identiques", () => {
    const utc = runProbe("UTC");
    const paris = runProbe("Europe/Paris");

    expect(utc).toEqual(expected);
    expect(paris).toEqual(expected);
    expect(paris).toEqual(utc);
  });
});
