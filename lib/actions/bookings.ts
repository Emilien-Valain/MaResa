"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { bookings, rooms, tenants } from "@/db/schema";
import { admitBooking } from "@/lib/booking-intake";
import { bookingManualSchema, parseFormData } from "@/lib/validation";
import { sendBookingCancellation } from "@/lib/email";
import type { TenantConfig } from "@/lib/tenant-context";
import type { BookingStatus } from "@/lib/queries/bookings";

async function requireTenantId() {
  const { tenantId } = await requireSession();
  return tenantId;
}

// Transitions légales (cf. CONTEXT.md > Booking status) :
//   pending   → confirmed | cancelled
//   confirmed → completed | cancelled
//   completed, cancelled = terminaux
// La mise à jour est conditionnée à l'état de départ autorisé : un saut illégal
// (ou un double-clic / page périmée) n'affecte aucune ligne. Retourne `true` si
// une transition a réellement eu lieu.
async function updateStatus(
  id: string,
  tenantId: string,
  status: BookingStatus,
  allowedFrom: BookingStatus[],
): Promise<boolean> {
  const transitioned = await db
    .update(bookings)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(bookings.id, id),
        eq(bookings.tenantId, tenantId),
        inArray(bookings.status, allowedFrom),
      ),
    )
    .returning({ id: bookings.id });

  if (transitioned.length === 0) return false;

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/calendrier");
  revalidatePath(`/admin/reservations/${id}`);
  return true;
}

export async function confirmBooking(id: string) {
  const tenantId = await requireTenantId();
  await updateStatus(id, tenantId, "confirmed", ["pending"]);
}

export async function cancelBooking(id: string) {
  const tenantId = await requireTenantId();
  const transitioned = await updateStatus(id, tenantId, "cancelled", [
    "pending",
    "confirmed",
  ]);

  // N'envoyer l'email d'annulation que si l'annulation a réellement eu lieu
  // (évite un second email si le booking était déjà annulé ou terminé).
  if (!transitioned) return;

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
  await updateStatus(id, tenantId, "completed", ["confirmed"]);
}

export async function createBookingManual(formData: FormData) {
  const tenantId = await requireTenantId();

  const data = parseFormData(bookingManualSchema, formData);
  const { roomId, guestName, guestEmail, guestCount } = data;
  const guestPhone = data.guestPhone || null;
  const checkIn = new Date(data.checkIn + "T00:00:00.000Z");
  const checkOut = new Date(data.checkOut + "T00:00:00.000Z");
  const notes = data.notes || null;

  // Admission : résout+autorise la chambre et calcule le prix. Les booking-rules
  // ne s'appliquent pas au manuel ; la dispo est contrôlée sauf override (« Forcer »).
  const { breakdown } = await admitBooking(
    { roomId, tenantId, checkIn, checkOut },
    { allowOverlap: data.force },
  );
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
