import { and, eq, gte, lte, or, sql, count, sum, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, rooms } from "@/db/schema";

// ─── Dates utilitaires ──────────────────────────────────────────────────────

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(): Date {
  const d = todayStart();
  const day = d.getDay(); // 0=dim, 1=lun
  d.setDate(d.getDate() - ((day + 6) % 7)); // lundi
  return d;
}

function startOfMonth(): Date {
  const d = todayStart();
  d.setDate(1);
  return d;
}

function endOfMonth(): Date {
  const d = todayStart();
  d.setMonth(d.getMonth() + 1, 0); // dernier jour du mois
  d.setHours(23, 59, 59, 999);
  return d;
}

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
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

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
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

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
