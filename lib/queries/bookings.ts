import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, payments, rooms } from "@/db/schema";
import { isUuid } from "@/lib/validation";

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
  // Un id mal formé n'existe pas : 404 côté page, pas d'erreur Postgres (500).
  if (!isUuid(id)) return undefined;
  return db.query.bookings.findFirst({
    where: and(eq(bookings.id, id), eq(bookings.tenantId, tenantId)),
    with: { room: { columns: { name: true, slug: true } } },
  });
}

/** Dernier paiement en ligne d'une réservation (aucun pour une saisie manuelle). */
export async function getLatestPayment(bookingId: string, tenantId: string) {
  // Même garde que getBookingByIdAndTenant : un id mal formé ferait échouer Postgres (500 au lieu de 404).
  if (!isUuid(bookingId)) return undefined;
  const [payment] = await db
    .select({ status: payments.status, amount: payments.amount, stripePaymentId: payments.stripePaymentId })
    .from(payments)
    .where(and(eq(payments.bookingId, bookingId), eq(payments.tenantId, tenantId)))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return payment;
}

/**
 * Passe en `completed` les séjours confirmés dont le jour de départ est passé
 * (cf. CONTEXT.md > Booking status) : l'hôte n'a jamais à le faire à la main.
 * Sans `tenantId` : tous les tenants (cron). Idempotent.
 */
export async function completeFinishedStays(tenantId?: string) {
  const conditions = [
    eq(bookings.status, "confirmed"),
    sql`${bookings.checkOut} < CURRENT_DATE`,
  ];
  if (tenantId) conditions.push(eq(bookings.tenantId, tenantId));
  const done = await db
    .update(bookings)
    .set({ status: "completed", updatedAt: new Date() })
    .where(and(...conditions))
    .returning({ id: bookings.id });
  return done.length;
}

/**
 * Filet de sécurité (cron) : un booking public `pending` sans aucune ligne de
 * paiement, vieux de plus d'une heure, n'a jamais atteint Stripe (crash entre
 * l'insertion et la session) — aucun webhook `expired` ne viendra le libérer.
 * Ceux qui ont une session sont laissés au webhook : Stripe les annule ou les confirme.
 */
export async function cancelOrphanPending() {
  const done = await db
    .update(bookings)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(bookings.status, "pending"),
        eq(bookings.source, "direct"),
        sql`${bookings.createdAt} < now() - interval '1 hour'`,
        sql`not exists (select 1 from ${payments} where ${payments.bookingId} = ${bookings.id})`,
      ),
    )
    .returning({ id: bookings.id });
  return done.length;
}

/** Réservations non annulées sur une plage, pour le calendrier (les terminées restent visibles dans le passé). */
export async function getActiveBookingsForCalendar(
  tenantId: string,
  from: Date,
  to: Date,
) {
  return db.query.bookings.findMany({
    where: and(
      eq(bookings.tenantId, tenantId),
      inArray(bookings.status, ["pending", "confirmed", "completed"]),
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
