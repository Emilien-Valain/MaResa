"use server";

import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { manualBlocks } from "@/db/schema";

/**
 * Retourne les dates bloquées manuellement pour une chambre dans [from, to[.
 * Inclut les blocages globaux (roomId IS NULL) et les blocages spécifiques.
 * Expand les blocages récurrents jour par jour.
 */
export async function getManualBlockedDates(
  roomId: string,
  tenantId: string,
  from: Date,
  to: Date,
): Promise<Date[]> {
  const blocks = await db
    .select()
    .from(manualBlocks)
    .where(
      and(
        eq(manualBlocks.tenantId, tenantId),
        or(eq(manualBlocks.roomId, roomId), isNull(manualBlocks.roomId)),
      ),
    );

  const blocked = new Set<string>();

  for (const block of blocks) {
    if (block.recurring && block.recurrenceType === "weekly") {
      const days = (block.recurrenceDays as number[]) ?? [];
      if (days.length === 0) continue;

      const cur = new Date(Math.max(from.getTime(), new Date(block.startDate).getTime()));
      cur.setUTCHours(0, 0, 0, 0);
      const rangeEnd = block.recurrenceUntil
        ? new Date(Math.min(to.getTime(), new Date(block.recurrenceUntil).getTime()))
        : to;

      while (cur < rangeEnd) {
        if (days.includes(cur.getUTCDay())) {
          blocked.add(cur.toISOString().split("T")[0]);
        }
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    } else {
      // Blocage ponctuel : expand les jours dans [startDate, endDate[ ∩ [from, to[
      const start = new Date(block.startDate);
      const end = new Date(block.endDate);
      const cur = new Date(Math.max(start.getTime(), from.getTime()));
      cur.setUTCHours(0, 0, 0, 0);
      const rangeEnd = new Date(Math.min(end.getTime(), to.getTime()));

      while (cur < rangeEnd) {
        blocked.add(cur.toISOString().split("T")[0]);
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }
  }

  return [...blocked]
    .sort()
    .map((d) => new Date(d + "T00:00:00.000Z"));
}

/**
 * Vérifie si un blocage manuel chevauche la période [checkIn, checkOut[.
 * Inclut les blocages globaux et récurrents.
 */
export async function hasManualBlockOverlap(
  roomId: string,
  tenantId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<boolean> {
  // Blocages ponctuels qui chevauchent
  const [oneOffBlock] = await db
    .select({ id: manualBlocks.id })
    .from(manualBlocks)
    .where(
      and(
        eq(manualBlocks.tenantId, tenantId),
        or(eq(manualBlocks.roomId, roomId), isNull(manualBlocks.roomId)),
        eq(manualBlocks.recurring, false),
        lt(manualBlocks.startDate, checkOut),
        gt(manualBlocks.endDate, checkIn),
      ),
    )
    .limit(1);

  if (oneOffBlock) return true;

  // Blocages récurrents : il faut expand et vérifier
  const recurringBlocks = await db
    .select()
    .from(manualBlocks)
    .where(
      and(
        eq(manualBlocks.tenantId, tenantId),
        or(eq(manualBlocks.roomId, roomId), isNull(manualBlocks.roomId)),
        eq(manualBlocks.recurring, true),
      ),
    );

  for (const block of recurringBlocks) {
    if (block.recurrenceType !== "weekly") continue;
    const days = (block.recurrenceDays as number[]) ?? [];
    if (days.length === 0) continue;

    const blockStart = new Date(block.startDate);
    const blockEnd = block.recurrenceUntil ? new Date(block.recurrenceUntil) : null;

    const cur = new Date(Math.max(checkIn.getTime(), blockStart.getTime()));
    cur.setUTCHours(0, 0, 0, 0);
    const rangeEnd = blockEnd
      ? new Date(Math.min(checkOut.getTime(), blockEnd.getTime()))
      : checkOut;

    while (cur < rangeEnd) {
      if (days.includes(cur.getUTCDay())) return true;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }

  return false;
}
