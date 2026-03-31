import { and, asc, desc, eq, gte, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, rooms } from "@/db/schema";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface BookingFilters {
  status?: BookingStatus;
  roomId?: string;
  from?: Date;
  to?: Date;
}

export async function getBookingsByTenant(
  tenantId: string,
  filters: BookingFilters = {},
) {
  const conditions = [eq(bookings.tenantId, tenantId)];

  if (filters.status) conditions.push(eq(bookings.status, filters.status));
  if (filters.roomId) conditions.push(eq(bookings.roomId, filters.roomId));
  if (filters.from) conditions.push(gte(bookings.checkOut, filters.from));
  if (filters.to) conditions.push(lte(bookings.checkIn, filters.to));

  return db.query.bookings.findMany({
    where: and(...conditions),
    with: { room: { columns: { name: true } } },
    orderBy: [desc(bookings.checkIn)],
  });
}

export async function getBookingByIdAndTenant(id: string, tenantId: string) {
  return db.query.bookings.findFirst({
    where: and(eq(bookings.id, id), eq(bookings.tenantId, tenantId)),
    with: { room: { columns: { name: true, slug: true } } },
  });
}

/** Réservations actives (pending + confirmed) sur une plage, pour le calendrier */
export async function getActiveBookingsForCalendar(
  tenantId: string,
  from: Date,
  to: Date,
) {
  return db.query.bookings.findMany({
    where: and(
      eq(bookings.tenantId, tenantId),
      or(eq(bookings.status, "pending"), eq(bookings.status, "confirmed")),
      lte(bookings.checkIn, to),
      gte(bookings.checkOut, from),
    ),
    columns: {
      id: true,
      roomId: true,
      checkIn: true,
      checkOut: true,
      status: true,
      guestName: true,
    },
  });
}
