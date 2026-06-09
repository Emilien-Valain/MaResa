/**
 * Primitive de précédence partagée entre la tarification et les règles de
 * réservation — voir ADR-0009 (et ADR-0006 pour le modèle pricing).
 *
 * Les deux familles de règles (`pricing_rules`, `booking_rules`) se résolvent
 * par la MÊME précédence : `priority` la plus haute → à égalité, la plus
 * spécifique (chambre > global, jour-restreint > tous-les-jours, fenêtre étroite
 * > toute-l'année) → à égalité, la plus récente. Elles ne diffèrent qu'à
 * l'agrégation : le pricing élit UNE règle gagnante (un scalaire), les
 * booking-rules résolvent CHAQUE champ indépendamment (merge par champ).
 */

export interface PrecedenceRule {
  roomId: string | null; // null = global
  validFrom: Date | string | null; // null = toute l'année
  validTo: Date | string | null;
  daysOfWeek?: number[] | null; // pricing uniquement ; absent/null = tous les jours
  priority: number;
  createdAt: Date | string | null;
}

function toTime(d: Date | string | null): number | null {
  if (d === null) return null;
  return (d instanceof Date ? d : new Date(d)).getTime();
}

/**
 * La règle s'applique-t-elle à cette date ? Contrôle la fenêtre de validité
 * `[validFrom, validTo]` (bornes incluses, date-seule) et, si présent, le jour
 * de la semaine (`daysOfWeek`, 0 = dimanche).
 */
export function appliesOn(rule: PrecedenceRule, date: Date): boolean {
  const from = toTime(rule.validFrom);
  const to = toTime(rule.validTo);
  if (from !== null && date.getTime() < from) return false;
  if (to !== null && date.getTime() > to) return false;
  if (rule.daysOfWeek && !rule.daysOfWeek.includes(date.getUTCDay())) return false;
  return true;
}

/** Étendue de la fenêtre en ms ; Infinity si toute-l'année (la moins spécifique). */
function windowSpan(rule: PrecedenceRule): number {
  const from = toTime(rule.validFrom);
  const to = toTime(rule.validTo);
  if (from === null && to === null) return Infinity;
  if (from !== null && to !== null) return to - from;
  return Infinity / 2; // une seule borne : plus spécifique qu'illimité, moins qu'une vraie fenêtre
}

/**
 * Comparateur de précédence : retourne < 0 si `a` l'emporte sur `b`
 * (la règle préférée se trie en premier). Ordre : priority desc → scope
 * (chambre > global) → jour-restreint > tous-jours → fenêtre étroite > large →
 * récence (createdAt desc).
 */
export function byPrecedence(a: PrecedenceRule, b: PrecedenceRule): number {
  if (a.priority !== b.priority) return b.priority - a.priority;

  const scope = (r: PrecedenceRule) => (r.roomId !== null ? 1 : 0);
  if (scope(a) !== scope(b)) return scope(b) - scope(a);

  const dayRestricted = (r: PrecedenceRule) => (r.daysOfWeek && r.daysOfWeek.length > 0 ? 1 : 0);
  if (dayRestricted(a) !== dayRestricted(b)) return dayRestricted(b) - dayRestricted(a);

  const spanA = windowSpan(a);
  const spanB = windowSpan(b);
  if (spanA !== spanB) return spanA - spanB; // fenêtre plus étroite (span plus petit) gagne

  const createdA = toTime(a.createdAt) ?? 0;
  const createdB = toTime(b.createdAt) ?? 0;
  return createdB - createdA; // plus récente gagne
}

/**
 * Filtre les règles applicables à `date` et les trie par précédence
 * (la plus prioritaire en premier). Le résolveur pricing prend `[0]` ; le
 * résolveur booking-rules fold champ par champ sur la liste ordonnée.
 */
export function orderByPrecedence<T extends PrecedenceRule>(rules: T[], date: Date): T[] {
  return rules.filter((r) => appliesOn(r, date)).sort(byPrecedence);
}
