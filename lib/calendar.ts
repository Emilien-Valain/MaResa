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

export function getCalendarMonth(year: number, month: number): CalendarMonth {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days: Date[] = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  return { year, month, days, firstDay, lastDay };
}

export function prevMonth(year: number, month: number) {
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}

export function nextMonth(year: number, month: number) {
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
}

/** Retourne true si `date` est dans l'intervalle [checkIn, checkOut[ */
export function isDateInBooking(date: Date, checkIn: Date, checkOut: Date) {
  const d = date.getTime();
  return d >= checkIn.getTime() && d < checkOut.getTime();
}

export function formatMonthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-300 text-amber-950",
  confirmed: "bg-emerald-400 text-emerald-950",
  cancelled: "bg-warm-200 text-warm-500 line-through",
  completed: "bg-sky-300 text-sky-950",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  cancelled: "Annulée",
  completed: "Terminée",
};
