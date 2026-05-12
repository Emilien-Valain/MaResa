import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getBookingByIdAndTenant } from "@/lib/queries/bookings";
import {
  confirmBooking,
  cancelBooking,
  completeBooking,
} from "@/lib/actions/bookings";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/calendar";
import ReservationPdfActions from "@/components/admin/ReservationPdfActions";

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenantId } = await requireSession();
  const reservation = await getBookingByIdAndTenant(id, tenantId);
  if (!reservation) notFound();

  const nights = Math.ceil(
    (new Date(reservation.checkOut).getTime() -
      new Date(reservation.checkIn).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return (
    <div className="space-y-6 max-w-2xl admin-fade-in">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/reservations"
          className="text-[13px] font-semibold transition-colors"
          style={{ color: "var(--admin-text-muted)" }}
        >
          ← Réservations
        </Link>
        <span
          className={`text-[12px] px-2.5 py-[3px] rounded-full font-semibold ${STATUS_COLORS[reservation.status]}`}
        >
          {STATUS_LABELS[reservation.status]}
        </span>
      </div>

      <h1
        className="text-[22px] font-extrabold"
        style={{ color: "var(--admin-text)", letterSpacing: "-0.5px" }}
      >
        {reservation.guestName}
      </h1>

      <div
        style={{
          background: "var(--admin-surface)",
          border: "1px solid var(--admin-border)",
          borderRadius: "var(--admin-radius)",
        }}
      >
        <Section label="Séjour">
          <Row label="Chambre" value={reservation.room?.name ?? "—"} />
          <Row
            label="Arrivée"
            value={new Date(reservation.checkIn).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
          <Row
            label="Départ"
            value={new Date(reservation.checkOut).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
          <Row label="Durée" value={`${nights} nuit${nights > 1 ? "s" : ""}`} />
          <Row
            label="Voyageurs"
            value={`${reservation.guestCount} personne${reservation.guestCount > 1 ? "s" : ""}`}
          />
        </Section>

        <Section label="Client">
          <Row label="Nom" value={reservation.guestName} />
          <Row label="Email" value={reservation.guestEmail} />
          {reservation.guestPhone && (
            <Row label="Téléphone" value={reservation.guestPhone} />
          )}
        </Section>

        <Section label="Paiement">
          <Row label="Total" value={`${reservation.totalPrice} €`} />
          <Row
            label="Source"
            value={
              reservation.source === "manual" ? "Saisie manuelle" : "Site web"
            }
          />
        </Section>

        {reservation.notes && (
          <Section label="Notes">
            <p
              className="text-[13px] px-5 pb-4"
              style={{ color: "var(--admin-text)" }}
            >
              {reservation.notes}
            </p>
          </Section>
        )}
      </div>

      <ReservationPdfActions bookingId={id} />

      <div className="flex gap-3">
        {reservation.status === "pending" && (
          <form action={confirmBooking.bind(null, id)}>
            <button
              type="submit"
              style={{
                padding: "9px 18px",
                background: "#16A34A",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Confirmer
            </button>
          </form>
        )}
        {reservation.status === "confirmed" && (
          <form action={completeBooking.bind(null, id)}>
            <button
              type="submit"
              style={{
                padding: "9px 18px",
                background: "#0284C7",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Marquer terminée
            </button>
          </form>
        )}
        {(reservation.status === "pending" ||
          reservation.status === "confirmed") && (
          <form action={cancelBooking.bind(null, id)}>
            <button
              type="submit"
              style={{
                padding: "9px 18px",
                background: "transparent",
                color: "#DC2626",
                border: "1px solid #FCA5A5",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="py-4"
      style={{ borderTop: "1px solid var(--admin-border-light)" }}
    >
      <p
        className="text-[11.5px] font-bold uppercase px-5 mb-3"
        style={{
          color: "var(--admin-text-muted)",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-5 py-1.5">
      <span className="text-[13px]" style={{ color: "var(--admin-text-muted)" }}>
        {label}
      </span>
      <span
        className="text-[13px] font-semibold"
        style={{ color: "var(--admin-text)" }}
      >
        {value}
      </span>
    </div>
  );
}
