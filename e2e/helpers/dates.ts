/**
 * Dates de fixtures E2E toujours dans le futur.
 *
 * Les specs écrivent leurs dates en dur (ex. fd("2026-06-10")) mais le
 * formulaire public impose checkIn >= aujourd'hui et l'export iCal ne couvre
 * qu'un horizon forward. `fd` décale donc chaque date d'un nombre ENTIER de
 * semaines, juste assez pour que la plus ancienne fixture (ANCHOR) tombe à
 * aujourd'hui + MARGIN_DAYS au moins :
 * - les écarts entre dates sont conservés (chevauchements, bornes exclusives)
 * - les jours de semaine sont conservés (blocages récurrents « le lundi »)
 *
 * Le décalage est calculé une fois par global-setup et transmis aux workers
 * via E2E_DATE_SHIFT_DAYS, pour qu'un run qui passe minuit reste cohérent.
 */

const DAY_MS = 86_400_000;
const ANCHOR = Date.UTC(2026, 4, 1); // 2026-05-01 : plus ancienne date de fixture
const MARGIN_DAYS = 14;

export function computeDateShiftDays(now = new Date()): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const deficit = today + MARGIN_DAYS * DAY_MS - ANCHOR;
  return deficit <= 0 ? 0 : Math.ceil(deficit / (7 * DAY_MS)) * 7;
}

function shiftDays(): number {
  const fromEnv = process.env.E2E_DATE_SHIFT_DAYS;
  return fromEnv !== undefined ? Number(fromEnv) : computeDateShiftDays();
}

/** Décale une date de fixture "YYYY-MM-DD" dans le futur (voir en-tête). */
export function fd(iso: string): string {
  const d = new Date(iso + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + shiftDays());
  return d.toISOString().slice(0, 10);
}

/** fd() au format d'affichage admin "JJ/MM/AAAA". */
export function fdFr(iso: string): string {
  const [y, m, d] = fd(iso).split("-");
  return `${d}/${m}/${y}`;
}

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** fd() au format long de la sidebar publique, regex « 15\s+juillet ». */
export function fdLongRe(iso: string): RegExp {
  const d = new Date(fd(iso) + "T00:00:00.000Z");
  return new RegExp(`${d.getUTCDate()}\\s+${MONTHS_FR[d.getUTCMonth()]}`);
}

/** Paramètres du calendrier admin (`month` indexé à 0) pour le mois de fd(). */
export function fdCalendarQuery(iso: string): string {
  const d = new Date(fd(iso) + "T00:00:00.000Z");
  return `year=${d.getUTCFullYear()}&month=${d.getUTCMonth()}`;
}
