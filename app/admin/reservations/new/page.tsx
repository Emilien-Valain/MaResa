import { parisToday, tomorrowStart } from "@/lib/date-windows";
import { requireSession } from "@/lib/session";
import { getRoomsByTenant } from "@/lib/queries/rooms";
import Link from "next/link";
import ManualBookingForm from "@/components/admin/ManualBookingForm";

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ roomId?: string; checkIn?: string; checkOut?: string }>;
}) {
  const { tenantId } = await requireSession();
  const [chambres, params] = await Promise.all([getRoomsByTenant(tenantId), searchParams]);

  // Pré-remplissage depuis le calendrier (?roomId=…&checkIn=AAAA-MM-JJ[&checkOut=…]) ;
  // valeur invalide → défaut, départ absent ou incohérent → une nuit.
  const parse = (v?: string) => {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(v ?? "") ? new Date(`${v}T00:00:00Z`) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  };
  const validPrefill = parse(params.checkIn);
  const prefillOut = parse(params.checkOut);
  const today = validPrefill ? validPrefill.toISOString().slice(0, 10) : parisToday();
  const tomorrow = validPrefill
    ? (prefillOut && prefillOut > validPrefill
        ? prefillOut
        : new Date(validPrefill.getTime() + 86400000)
      ).toISOString().slice(0, 10)
    : tomorrowStart().toISOString().slice(0, 10);
  const defaultRoomId = chambres.some((c) => c.active && c.id === params.roomId)
    ? params.roomId
    : undefined;

  return (
    <div className="space-y-6 max-w-xl admin-fade-in">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/reservations"
          className="text-[13px] font-semibold transition-colors"
          style={{ color: "var(--admin-text-muted)" }}
        >
          ← Réservations
        </Link>
      </div>

      <h1
        className="text-[24px] font-extrabold leading-tight"
        style={{ color: "var(--admin-text)", letterSpacing: "-0.6px" }}
      >
        Nouvelle réservation
      </h1>

      <ManualBookingForm
        rooms={chambres
          .filter((c) => c.active)
          .map((c) => ({ id: c.id, name: c.name, pricePerNight: String(c.pricePerNight) }))}
        today={today}
        tomorrow={tomorrow}
        defaultRoomId={defaultRoomId}
      />
    </div>
  );
}
