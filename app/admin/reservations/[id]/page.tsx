import { formatEuros } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import {
  getBookingByIdAndTenant,
  getLatestPayment,
  completeFinishedStays,
} from "@/lib/queries/bookings";
import { confirmBooking, cancelBooking, setBookingPaid } from "@/lib/actions/bookings";
import ReservationPdfActions from "@/components/admin/ReservationPdfActions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ChannelTag, PrimaryButton, StatusBadge, StatusBanner } from "@/components/admin/ui";

// Statut du paiement en ligne → libellé hôte + couleur de badge (palette des statuts).
const PAYMENT_LABEL: Record<string, { label: string; tone: string }> = {
  paid: { label: "Payé en ligne", tone: "confirmed" },
  pending: { label: "Paiement en cours", tone: "pending" },
  failed: { label: "Paiement échoué", tone: "cancelled" },
  expired: { label: "Paiement non abouti", tone: "cancelled" },
  refunded: { label: "Remboursé", tone: "completed" },
};

export default async function ReservationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enregistree?: string; annulee?: string }>;
}) {
  const { id } = await params;
  const { enregistree, annulee } = await searchParams;
  const { tenantId } = await requireSession();
  await completeFinishedStays(tenantId);
  const [reservation, payment] = await Promise.all([
    getBookingByIdAndTenant(id, tenantId),
    getLatestPayment(id, tenantId),
  ]);
  if (!reservation) notFound();
  // Le client a payé sur Stripe après l'annulation (webhook : le booking reste annulé).
  const paidAfterCancel = reservation.status === "cancelled" && payment?.status === "paid";
  const paymentInfo = paidAfterCancel
    ? { label: "Payé après annulation", tone: "cancelled" }
    : payment
      ? PAYMENT_LABEL[payment.status]
      : undefined;

  const nights = Math.ceil(
    (new Date(reservation.checkOut).getTime() -
      new Date(reservation.checkIn).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return (
    <div className="space-y-6 max-w-2xl admin-fade-in">
      <Link
        href="/admin/reservations"
        className="inline-block text-[13px] font-semibold transition-colors"
        style={{ color: "var(--admin-text-muted)" }}
      >
        ← Réservations
      </Link>

      <div className="flex items-center gap-3 flex-wrap">
        <h1
          className="text-[24px] font-extrabold leading-tight"
          style={{ color: "var(--admin-text)", letterSpacing: "-0.6px" }}
        >
          {reservation.guestName}
        </h1>
        <StatusBadge status={reservation.status} />
      </div>

      {paidAfterCancel && (
        <StatusBanner variant="error">
          {reservation.guestName} a payé {formatEuros(payment.amount)} en ligne après l&apos;annulation.
          Remboursez-le depuis votre tableau de bord Stripe
          {payment.stripePaymentId ? ` (paiement ${payment.stripePaymentId})` : ""}.
        </StatusBanner>
      )}

      {/* Retour après action : l'hôte sait que c'est fait, et ce qui en découle. */}
      <div role="status">
        {enregistree && (
          <StatusBanner variant="success">
            Réservation enregistrée. Ces nuits ne sont plus proposées sur votre site.
          </StatusBanner>
        )}
        {annulee === "1" && (
          <StatusBanner variant="success">
            Réservation annulée. Un email d&apos;annulation a été envoyé à {reservation.guestEmail}.
          </StatusBanner>
        )}
        {annulee === "sans-email" && (
          <StatusBanner variant="warning">
            Réservation annulée, mais l&apos;email n&apos;a pas pu partir : prévenez{" "}
            {reservation.guestName} directement.
          </StatusBanner>
        )}
      </div>

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
          <Row
            label="Email"
            value={<ContactLink href={`mailto:${reservation.guestEmail}`}>{reservation.guestEmail}</ContactLink>}
          />
          {reservation.guestPhone && (
            <Row
              label="Téléphone"
              value={
                <ContactLink href={`tel:${reservation.guestPhone.replace(/[^\d+]/g, "")}`}>
                  {reservation.guestPhone}
                </ContactLink>
              }
            />
          )}
        </Section>

        <Section label="Paiement">
          <Row label="Total" value={formatEuros(reservation.totalPrice)} />
          <Row
            label="Règlement"
            value={
              paymentInfo ? (
                <StatusBadge status={paymentInfo.tone} label={paymentInfo.label} />
              ) : reservation.paidAt ? (
                <span className="inline-flex items-center gap-2">
                  <StatusBadge
                    status="confirmed"
                    label={`Réglé le ${new Date(reservation.paidAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`}
                  />
                  <form action={setBookingPaid.bind(null, id, false)}>
                    <button type="submit" className="text-[12px] underline underline-offset-2" style={{ color: "var(--admin-text-muted)" }}>
                      Annuler
                    </button>
                  </form>
                </span>
              ) : reservation.status === "cancelled" ? (
                <StatusBadge status="completed" label="Rien à régler" />
              ) : reservation.source === "manual" ? (
                <span className="inline-flex items-center gap-2">
                  <StatusBadge status="pending" label="À régler avec le client" />
                  <form action={setBookingPaid.bind(null, id, true)}>
                    <button
                      type="submit"
                      className="admin-btn"
                      style={{ padding: "5px 10px", fontSize: 12.5, color: "var(--admin-primary)", background: "var(--admin-primary-light)", border: "none" }}
                    >
                      Marquer réglé
                    </button>
                  </form>
                </span>
              ) : (
                <StatusBadge status="completed" label="Aucun paiement enregistré" />
              )
            }
          />
          <Row label="Origine" value={<ChannelTag channel={reservation.source} />} />
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

      {(reservation.status === "pending" || reservation.status === "confirmed") && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {reservation.status === "pending" ? (
            <form action={confirmBooking.bind(null, id)}>
              <PrimaryButton type="submit" icon={null}>
                Confirmer
              </PrimaryButton>
            </form>
          ) : (
            <p className="text-[12.5px]" style={{ color: "var(--admin-text-subtle)" }}>
              Passera automatiquement en « Terminée » après le départ.
            </p>
          )}
          <ConfirmButton
            title={`Annuler la réservation de ${reservation.guestName} ?`}
            message={
              <>
                La chambre sera libérée et un email d&apos;annulation sera envoyé à{" "}
                <strong style={{ color: "var(--admin-text)" }}>{reservation.guestEmail}</strong>.
                Cette action est définitive.
              </>
            }
            cancelLabel="Garder"
            confirmLabel="Annuler la réservation"
            onConfirm={cancelBooking.bind(null, id)}
            style={{
              padding: "9px 18px",
              background: "transparent",
              color: "var(--admin-danger)",
              border: "1px solid #FCA5A5",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Annuler la réservation
          </ConfirmButton>
        </div>
      )}
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
        className="text-[12px] font-bold uppercase px-5 mb-3"
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

function ContactLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="underline underline-offset-2 decoration-[var(--admin-border)] hover:decoration-current break-all"
      style={{ color: "var(--admin-primary)" }}
    >
      {children}
    </a>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-4 px-5 py-1.5">
      <span className="text-[13px]" style={{ color: "var(--admin-text-muted)" }}>
        {label}
      </span>
      <span
        className="text-[13px] font-semibold text-right"
        style={{ color: "var(--admin-text)" }}
      >
        {value}
      </span>
    </div>
  );
}
