import { and, eq, gt, isNull, lt, or, type Column } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, icalBlocks, manualBlocks } from "@/db/schema";

/**
 * Module Hold — la disponibilité, calculée une seule fois.
 *
 * Un `Hold` est un span `[start, end)` pendant lequel une chambre est tenue,
 * quelle qu'en soit la cause : un Booking (pending/confirmed), un iCal Block
 * importé, ou un manual Block (récurrence hebdo incluse). La disponibilité est
 * le complément des Holds. Voir CONTEXT.md (« Hold ») et ADR-0007.
 *
 * Ce module possède LE prédicat d'overlap et LA logique d'expansion de
 * récurrence — réécrits jusqu'ici dans chaque consommateur. Tous les
 * consommateurs (isRoomAvailable, getAvailableRooms, getBlockedDates,
 * export iCal) dérivent de `blockedDates`.
 */

/** Une date calendaire UTC bloquée, au format "YYYY-MM-DD". */
export type IsoDate = string;

/** Fenêtre half-open `[start, end)` sur laquelle matérialiser les Holds. */
export type Window = { start: Date; end: Date };

const toIso = (d: Date): IsoDate => d.toISOString().slice(0, 10);

/** Ajoute au set chaque date de `[from, to)` ∩ `window`, en UTC, jour par jour. */
function addInterval(
  set: Set<IsoDate>,
  from: Date,
  to: Date,
  window: Window,
  keep?: (d: Date) => boolean,
): void {
  const cur = new Date(Math.max(from.getTime(), window.start.getTime()));
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(Math.min(to.getTime(), window.end.getTime()));
  while (cur < end) {
    if (!keep || keep(cur)) set.add(toIso(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
}

/**
 * LE seam. Énumère chaque date de `window` où la chambre est tenue (Hold),
 * toutes sources confondues. Half-open, fin exclusive.
 *
 * - Bookings `pending` + `confirmed` qui chevauchent la fenêtre.
 * - iCal blocks qui chevauchent la fenêtre.
 * - Manual blocks (par chambre + globaux `roomId IS NULL`) :
 *     - ponctuel : intervalle `[startDate, endDate)`.
 *     - récurrent hebdo : `startDate` = ancre, `recurrenceUntil` = fin
 *       EXCLUSIVE (NULL = ouvert, borné par la fenêtre), `endDate` ignoré,
 *       `recurrenceDays` = jours de semaine tenus (0 = dimanche).
 */
export async function blockedDates(
  roomId: string,
  tenantId: string,
  window: Window,
): Promise<Set<IsoDate>> {
  const overlapsWindow = (start: Column, end: Column) =>
    and(lt(start, window.end), gt(end, window.start));

  const [activeBookings, blocks, manuals] = await Promise.all([
    db
      .select({ checkIn: bookings.checkIn, checkOut: bookings.checkOut })
      .from(bookings)
      .where(
        and(
          eq(bookings.roomId, roomId),
          eq(bookings.tenantId, tenantId),
          or(eq(bookings.status, "pending"), eq(bookings.status, "confirmed")),
          overlapsWindow(bookings.checkIn, bookings.checkOut),
        ),
      ),
    db
      .select({ start: icalBlocks.start, end: icalBlocks.end })
      .from(icalBlocks)
      .where(
        and(
          eq(icalBlocks.roomId, roomId),
          eq(icalBlocks.tenantId, tenantId),
          overlapsWindow(icalBlocks.start, icalBlocks.end),
        ),
      ),
    // Les blocages récurrents ne se filtrent pas proprement par fenêtre en SQL
    // (pas d'intervalle matériel) : on récupère tous les manual blocks de la
    // chambre + globaux, et on matérialise app-side.
    db
      .select()
      .from(manualBlocks)
      .where(
        and(
          eq(manualBlocks.tenantId, tenantId),
          or(eq(manualBlocks.roomId, roomId), isNull(manualBlocks.roomId)),
        ),
      ),
  ]);

  const set = new Set<IsoDate>();

  for (const b of activeBookings) {
    addInterval(set, new Date(b.checkIn), new Date(b.checkOut), window);
  }
  for (const b of blocks) {
    addInterval(set, new Date(b.start), new Date(b.end), window);
  }
  for (const m of manuals) {
    if (m.recurring && m.recurrenceType === "weekly") {
      const days = (m.recurrenceDays as number[]) ?? [];
      if (days.length === 0) continue;
      const until = m.recurrenceUntil ? new Date(m.recurrenceUntil) : window.end;
      addInterval(set, new Date(m.startDate), until, window, (d) =>
        days.includes(d.getUTCDay()),
      );
    } else {
      addInterval(set, new Date(m.startDate), new Date(m.endDate), window);
    }
  }

  return set;
}

/** Un Hold matérialisé en intervalle half-open de dates calendaires. */
export type HoldInterval = { start: Date; end: Date };

/**
 * Recolle un ensemble de dates bloquées en intervalles `[start, end)`
 * consécutifs. Helper de présentation (export iCal) — pas un second seam.
 */
export function coalesce(dates: Set<IsoDate>): HoldInterval[] {
  const sorted = [...dates].sort();
  const intervals: HoldInterval[] = [];
  for (const iso of sorted) {
    const day = new Date(iso + "T00:00:00.000Z");
    const last = intervals[intervals.length - 1];
    if (last && day.getTime() === last.end.getTime()) {
      // jour contigu : étend l'intervalle (fin exclusive = jour suivant)
      last.end = new Date(day.getTime() + 86_400_000);
    } else {
      intervals.push({ start: day, end: new Date(day.getTime() + 86_400_000) });
    }
  }
  return intervals;
}
