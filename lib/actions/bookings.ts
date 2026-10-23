"use server";

import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { bookings, rooms, tenants } from "@/db/schema";
import { admitBooking, CapacityError, RoomUnavailableError } from "@/lib/booking-intake";
import { bookingManualSchema, frDateToIso, isStayTooLong, isUuid, safeParseFormData } from "@/lib/validation";
import { calculatePrice } from "@/lib/pricing";
import { sendBookingCancellation } from "@/lib/email";
import type { TenantConfig } from "@/lib/tenant-context";
import type { BookingStatus } from "@/lib/queries/bookings";

async function requireTenantId() {
  const { tenantId } = await requireSession();
  return tenantId;
}

// Transitions légales (cf. CONTEXT.md > Booking status) :
//   pending   → confirmed | cancelled
//   confirmed → completed (automatique après le départ : completeFinishedStays) | cancelled
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

  // Envoyer l'email d'annulation au client (best-effort) ; l'hôte est prévenu
  // s'il n'est pas parti, pour qu'il contacte le client lui-même.
  let emailSent = false;
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
      emailSent = true;
    }
  } catch (emailError) {
    console.error("Erreur envoi email annulation:", emailError);
  }

  redirect(`/admin/reservations/${id}?annulee=${emailSent ? "1" : "sans-email"}`);
}

/**
 * Règlement hors ligne (virement, chèque, espèces) : l'hôte le note lui-même.
 * Annulable (`paid = false`) tant que la réservation n'est pas annulée.
 */
export async function setBookingPaid(id: string, paid: boolean) {
  const tenantId = await requireTenantId();
  await db
    .update(bookings)
    .set({ paidAt: paid ? new Date() : null, updatedAt: new Date() })
    .where(
      and(
        eq(bookings.id, id),
        eq(bookings.tenantId, tenantId),
        inArray(bookings.status, ["pending", "confirmed", "completed"]),
      ),
    );
  revalidatePath(`/admin/reservations/${id}`);
  revalidatePath("/admin/reservations");
}

/**
 * Devis pour le formulaire manuel : même résolveur que la facturation, donc le
 * total affiché avant d'enregistrer est celui qui sera enregistré.
 * `null` tant que la saisie ne décrit pas un séjour valide.
 */
export async function quoteManualBooking(
  roomId: string,
  checkIn: string,
  checkOut: string,
): Promise<{ nights: number; total: number } | null> {
  const tenantId = await requireTenantId();
  if (!isUuid(roomId)) return null;
  const from = new Date(frDateToIso(checkIn) + "T00:00:00.000Z");
  const to = new Date(frDateToIso(checkOut) + "T00:00:00.000Z");
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || to <= from) return null;
  if (isStayTooLong(from, to)) return null;
  const room = await db.query.rooms.findFirst({
    where: and(eq(rooms.id, roomId), eq(rooms.tenantId, tenantId)),
    columns: { id: true },
  });
  if (!room) return null;
  const { nights, totalPrice } = await calculatePrice(roomId, tenantId, from, to);
  return { nights: nights.length, total: totalPrice };
}

export type ManualBookingState = {
  error: string;
  /** Erreur par champ (aria-invalid + message sous le libellé). */
  fieldErrors?: Record<string, string>;
  /** Les dates chevauchent un Hold : le formulaire propose alors « Forcer ». */
  conflict?: boolean;
  /** Valeurs saisies, pour ne pas vider le formulaire après une erreur. */
  values: Record<string, string>;
} | null;

export async function createBookingManual(
  _prev: ManualBookingState,
  formData: FormData,
): Promise<ManualBookingState> {
  const tenantId = await requireTenantId();
  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") values[k] = v;

  const parsed = safeParseFormData(bookingManualSchema, formData);
  if ("error" in parsed) return { ...parsed, values };
  const { data } = parsed;
  const { roomId, guestName, guestEmail, guestCount } = data;
  const guestPhone = data.guestPhone || null;
  const checkIn = new Date(data.checkIn + "T00:00:00.000Z");
  const checkOut = new Date(data.checkOut + "T00:00:00.000Z");
  const notes = data.notes || null;

  // Admission : résout+autorise la chambre, calcule le prix et insère sous verrou.
  // Les booking-rules ne s'appliquent pas au manuel ; la dispo est contrôlée sauf
  // override (« Forcer »).
  let bookingId: string;
  try {
    bookingId = await admitBooking(
      { roomId, tenantId, checkIn, checkOut, guestCount },
      { allowOverlap: data.force },
      async (tx, { breakdown }) => {
        const [row] = await tx
          .insert(bookings)
          .values({
            tenantId,
            roomId,
            checkIn,
            checkOut,
            // Prix convenu avec le client (téléphone, fidèle…) sinon prix calculé.
            totalPrice: data.agreedPrice
              ? data.agreedPrice.replace(",", ".")
              : breakdown.totalPrice.toFixed(2),
            guestName,
            guestEmail,
            guestPhone,
            guestCount,
            notes,
            status: "confirmed",
            source: "manual",
          })
          .returning({ id: bookings.id });
        return row.id;
      },
    );
  } catch (e) {
    if (e instanceof RoomUnavailableError) {
      // Nommer ce qui bloque : l'hôte décide de forcer en connaissance de cause.
      const clash = await db.query.bookings.findFirst({
        where: and(
          eq(bookings.tenantId, tenantId),
          eq(bookings.roomId, roomId),
          inArray(bookings.status, ["pending", "confirmed"]),
          lt(bookings.checkIn, checkOut),
          gt(bookings.checkOut, checkIn),
        ),
        columns: { guestName: true, checkIn: true, checkOut: true },
      });
      const day = (d: Date) =>
        new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
      return {
        error: clash
          ? `Ces dates chevauchent le séjour de ${clash.guestName} (du ${day(clash.checkIn)} au ${day(clash.checkOut)}).`
          : "Ces dates chevauchent un blocage sur cette chambre (calendrier Airbnb/Booking ou blocage manuel).",
        conflict: true,
        values,
      };
    }
    if (e instanceof CapacityError) {
      return { error: e.message, fieldErrors: { guestCount: e.message }, values };
    }
    if (e instanceof Error && e.message === "Chambre introuvable") {
      return {
        error: "Cette chambre n'existe plus ou est désactivée.",
        fieldErrors: { roomId: "Chambre indisponible" },
        values,
      };
    }
    throw e;
  }

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/calendrier");
  redirect(`/admin/reservations/${bookingId}?enregistree=1`);
}
