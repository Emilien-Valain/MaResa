"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { bookings, rooms } from "@/db/schema";
import { bookingManualSchema, parseFormData } from "@/lib/validation";
import type { BookingStatus } from "@/lib/queries/bookings";

async function requireTenantId() {
  const { tenantId } = await requireSession();
  return tenantId;
}

async function updateStatus(id: string, tenantId: string, status: BookingStatus) {
  await db
    .update(bookings)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(bookings.id, id), eq(bookings.tenantId, tenantId)));

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/calendrier");
  revalidatePath(`/admin/reservations/${id}`);
}

export async function confirmBooking(id: string) {
  const tenantId = await requireTenantId();
  await updateStatus(id, tenantId, "confirmed");
}

export async function cancelBooking(id: string) {
  const tenantId = await requireTenantId();
  await updateStatus(id, tenantId, "cancelled");
}

export async function completeBooking(id: string) {
  const tenantId = await requireTenantId();
  await updateStatus(id, tenantId, "completed");
}

export async function createBookingManual(formData: FormData) {
  const tenantId = await requireTenantId();

  const data = parseFormData(bookingManualSchema, formData);
  const { roomId, guestName, guestEmail, guestCount } = data;
  const guestPhone = data.guestPhone || null;
  const checkIn = new Date(data.checkIn + "T00:00:00.000Z");
  const checkOut = new Date(data.checkOut + "T00:00:00.000Z");
  const notes = data.notes || null;

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
    columns: { pricePerNight: true },
  });

  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );
  const totalPrice = room
    ? (parseFloat(room.pricePerNight) * nights).toFixed(2)
    : "0";

  await db.insert(bookings).values({
    tenantId,
    roomId,
    checkIn,
    checkOut,
    totalPrice,
    guestName,
    guestEmail,
    guestPhone,
    guestCount,
    notes,
    status: "confirmed",
    source: "manual",
  });

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/calendrier");
  redirect("/admin/reservations");
}
