/**
 * Fenêtres de dates pour les KPI du dashboard.
 *
 * Les dates domaine sont stockées en UTC minuit et comparées date-only
 * (ADR-0005). Toute l'arithmétique ci-dessous est donc faite avec les
 * accesseurs UTC (`getUTC*`/`setUTC*`) pour que les bornes (jour / semaine /
 * mois / demain) soient identiques quel que soit le `TZ` du serveur. Avec des
 * accesseurs locaux, un déploiement hors UTC (ex. `Europe/Paris`) décalerait
 * les bornes de l'offset et une réservation proche de minuit tomberait dans le
 * mauvais bucket. Voir `.scratch/timezone-dates/issues/01`.
 *
 * « Aujourd'hui » est la date calendaire à Paris (l'hôte vit à l'heure française) :
 * à 00:30 heure de Paris on est déjà le lendemain, même si UTC est encore la veille.
 * Cette date est ensuite exprimée en UTC minuit, comme toutes les dates domaine.
 *
 * Chaque helper accepte un `now` injectable pour des tests déterministes ;
 * il défaut à l'instant courant.
 */

// shortcut: fuseau unique pour tous les tenants, à passer en config tenant si un établissement hors France arrive.
export const HOTEL_TIME_ZONE = "Europe/Paris";

/** Date du jour à Paris, au format YYYY-MM-DD. */
export function parisToday(now: Date = new Date()): string {
  // en-CA formate en YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: HOTEL_TIME_ZONE }).format(now);
}

/** Date du jour à Paris, en UTC minuit. */
export function todayStart(now: Date = new Date()): Date {
  return new Date(`${parisToday(now)}T00:00:00.000Z`);
}

/** Minuit UTC du lendemain de `now` (borne haute exclusive d'« aujourd'hui »). */
export function tomorrowStart(now: Date = new Date()): Date {
  const d = todayStart(now);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/** Lundi minuit UTC de la semaine de `now`. */
export function startOfWeek(now: Date = new Date()): Date {
  const d = todayStart(now);
  const day = d.getUTCDay(); // 0=dim, 1=lun
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7)); // recule jusqu'au lundi
  return d;
}

/** 1er du mois de `now`, minuit UTC. */
export function startOfMonth(now: Date = new Date()): Date {
  const d = todayStart(now);
  d.setUTCDate(1);
  return d;
}

/** Dernier jour du mois de `now`, 23:59:59.999 UTC (borne haute inclusive). */
export function endOfMonth(now: Date = new Date()): Date {
  const d = todayStart(now);
  d.setUTCMonth(d.getUTCMonth() + 1, 0); // jour 0 du mois suivant = dernier jour
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
