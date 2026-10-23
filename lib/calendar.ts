/**
 * Utilitaires calendrier — logique pure, sans dépendance UI.
 * Évolutif : remplacer les pages par du drag-and-drop sans toucher à ce fichier.
 */

export interface CalendarMonth {
  year: number;
  month: number; // 0-indexed
  days: Date[];
  firstDay: Date;
  lastDay: Date;
}

// Les dates domaine sont stockées en UTC minuit (ADR-0005). On construit donc
// la grille du mois en UTC (`Date.UTC` / `getUTCDate`) pour qu'elle s'aligne
// sur les réservations comparées date-only, indépendamment du `TZ` serveur.
// Voir `.scratch/timezone-dates/issues/01`.
export function getCalendarMonth(year: number, month: number): CalendarMonth {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));

  const days: Date[] = [];
  for (let d = 1; d <= lastDay.getUTCDate(); d++) {
    days.push(new Date(Date.UTC(year, month, d)));
  }

  return { year, month, days, firstDay, lastDay };
}

export function prevMonth(year: number, month: number) {
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}

export function nextMonth(year: number, month: number) {
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
}

export function formatMonthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  cancelled: "Annulée",
  completed: "Terminée",
};
