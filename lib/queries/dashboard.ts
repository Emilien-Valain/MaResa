import { and, eq, gte, lte, or, sql, count, sum, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, rooms } from "@/db/schema";
import {
  todayStart,
  tomorrowStart,
  startOfWeek,
  startOfMonth,
  endOfMonth,
} from "@/lib/date-windows";

// Bornes de dates (jour/semaine/mois) — toute l'arithmétique est en UTC pour
// rester alignée sur le stockage UTC-minuit des dates domaine (ADR-0005) et
// donc indépendante du `TZ` serveur. Voir `lib/date-windows.ts`.

// ─── Prochaines arrivées / départs ──────────────────────────────────────────

export async function getUpcomingCheckIns(tenantId: string, limit = 8) {
  const today = todayStart();

  return db.query.bookings.findMany({
    where: and(
      eq(bookings.tenantId, tenantId),
      gte(bookings.checkIn, today),
      or(eq(bookings.status, "pending"), eq(bookings.status, "confirmed")),
    ),
    with: { room: { columns: { name: true } } },
    orderBy: [asc(bookings.checkIn)],
    limit,
  });
}

export async function getUpcomingCheckOuts(tenantId: string, limit = 8) {
  const today = todayStart();

  return db.query.bookings.findMany({
    where: and(
      eq(bookings.tenantId, tenantId),
      gte(bookings.checkOut, today),
      or(eq(bookings.status, "confirmed"), eq(bookings.status, "completed")),
    ),
    with: { room: { columns: { name: true } } },
    orderBy: [asc(bookings.checkOut)],
    limit,
  });
}

// ─── Répartition par canal ──────────────────────────────────────────────────

export async function getBookingsByChannel(tenantId: string) {
  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();

  const rows = await db
    .select({
      source: bookings.source,
      count: count(),
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        gte(bookings.createdAt, monthStart),
        lte(bookings.createdAt, monthEnd),
        or(
          eq(bookings.status, "pending"),
          eq(bookings.status, "confirmed"),
          eq(bookings.status, "completed"),
        ),
      ),
    )
    .groupBy(bookings.source);

  return rows;
}

// ─── Taux d'occupation ──────────────────────────────────────────────────────

export async function getOccupancyRate(tenantId: string) {
  const today = todayStart();
  const tomorrow = tomorrowStart();

  // Nombre total de chambres actives
  const [totalResult] = await db
    .select({ total: count() })
    .from(rooms)
    .where(and(eq(rooms.tenantId, tenantId), eq(rooms.active, true)));

  const totalRooms = totalResult?.total ?? 0;

  if (totalRooms === 0) return { occupied: 0, total: 0, rate: 0 };

  // Chambres occupées aujourd'hui (booking confirmed/pending dont checkIn <= today < checkOut)
  const [occupiedResult] = await db
    .select({ occupied: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        lte(bookings.checkIn, today),
        gte(bookings.checkOut, tomorrow),
        or(eq(bookings.status, "confirmed"), eq(bookings.status, "pending")),
      ),
    );

  const occupied = occupiedResult?.occupied ?? 0;

  return {
    occupied,
    total: totalRooms,
    rate: Math.round((occupied / totalRooms) * 100),
  };
}

// ─── Chiffre d'affaires ─────────────────────────────────────────────────────

async function getRevenueForPeriod(tenantId: string, from: Date, to: Date) {
  const [result] = await db
    .select({ revenue: sum(bookings.totalPrice) })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        gte(bookings.createdAt, from),
        lte(bookings.createdAt, to),
        or(eq(bookings.status, "confirmed"), eq(bookings.status, "completed")),
      ),
    );

  return parseFloat(result?.revenue ?? "0");
}

export async function getRevenue(tenantId: string) {
  const today = todayStart();
  const tomorrow = tomorrowStart();

  const [day, week, month] = await Promise.all([
    getRevenueForPeriod(tenantId, today, tomorrow),
    getRevenueForPeriod(tenantId, startOfWeek(), tomorrow),
    getRevenueForPeriod(tenantId, startOfMonth(), endOfMonth()),
  ]);

  return { day, week, month };
}

// ─── Tout en un ─────────────────────────────────────────────────────────────

export async function getDashboardData(tenantId: string) {
  const [checkIns, checkOuts, channels, occupancy, revenue] = await Promise.all([
    getUpcomingCheckIns(tenantId),
    getUpcomingCheckOuts(tenantId),
    getBookingsByChannel(tenantId),
    getOccupancyRate(tenantId),
    getRevenue(tenantId),
  ]);

  return { checkIns, checkOuts, channels, occupancy, revenue };
}
