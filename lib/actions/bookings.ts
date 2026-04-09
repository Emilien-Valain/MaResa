"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { bookings, rooms, tenants } from "@/db/schema";
import { calculatePrice } from "@/lib/pricing";
import { bookingManualSchema, parseFormData } from "@/lib/validation";
import { sendBookingCancellation } from "@/lib/email";
import type { TenantConfig } from "@/lib/tenant-context";
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

  // Envoyer l'email d'annulation au client (best-effort)
  try {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.tenantId, tenantId)))
      .limit(1);

    if (booking) {
      const [room] = await db
        .select({ name: rooms.name })
        .from(rooms)
        .where(eq(rooms.id, booking.roomId))
        .limit(1);

      const [tenant] = await db
        .select({ name: tenants.name, config: tenants.config })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      const config = (tenant?.config ?? {}) as TenantConfig;

      await sendBookingCancellation({
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        roomName: room?.name ?? "Chambre",
        checkIn: new Date(booking.checkIn),
        checkOut: new Date(booking.checkOut),
        hotelName: tenant?.name ?? "Hôtel",
        config,
        reason: "admin",
      });
    }
  } catch (emailError) {
    console.error("Erreur envoi email annulation:", emailError);
  }
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

  // Calcul du prix dynamique
  const breakdown = await calculatePrice(roomId, tenantId, checkIn, checkOut);
  const totalPrice = breakdown.totalPrice.toFixed(2);

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
