/**
 * Sonde exécutée en sous-processus sous différents `TZ` par
 * `date-windows.spec.ts`. Calcule les bornes KPI pour un instant fixe et
 * imprime le résultat en JSON sur stdout. Comme les helpers font tout en UTC,
 * la sortie doit être identique quel que soit le `TZ` du process.
 */
import {
  todayStart,
  tomorrowStart,
  startOfWeek,
  startOfMonth,
  endOfMonth,
} from "../../lib/date-windows";

// 15 jan 2026, 12:00 UTC (jeudi). Semaine ISO : lundi = 12 jan.
const now = new Date("2026-01-15T12:00:00.000Z");
// Résa créée proche de minuit le dernier jour du mois : 31 jan 23:30 UTC.
// Sous `Europe/Paris` (UTC+1), une borne de fin de mois calculée en local
// vaudrait 31 jan 22:59:59 UTC et exclurait à tort cette résa.
const bookingNearMidnight = new Date("2026-01-31T23:30:00.000Z");

const monthStart = startOfMonth(now);
const monthEnd = endOfMonth(now);

const result = {
  todayStart: todayStart(now).toISOString(),
  tomorrowStart: tomorrowStart(now).toISOString(),
  startOfWeek: startOfWeek(now).toISOString(),
  startOfMonth: monthStart.toISOString(),
  endOfMonth: monthEnd.toISOString(),
  bookingInMonth:
    bookingNearMidnight >= monthStart && bookingNearMidnight <= monthEnd,
  // « Aujourd'hui » = date à Paris : 23:30 UTC en hiver (UTC+1) et 22:30 UTC en été (UTC+2) = lendemain 00:30.
  todayParisWinterNight: todayStart(new Date("2026-01-15T23:30:00.000Z")).toISOString(),
  todayParisSummerNight: todayStart(new Date("2026-07-15T22:30:00.000Z")).toISOString(),
  todayParisSummerEvening: todayStart(new Date("2026-07-15T21:30:00.000Z")).toISOString(),
};

process.stdout.write(JSON.stringify(result));
