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
 * Chaque helper accepte un `now` injectable pour des tests déterministes ;
 * il défaut à l'instant courant.
 */

/** Minuit UTC du jour de `now`. */
export function todayStart(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
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
