import { formatEuros } from "@/lib/utils";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getBookingsByTenant, completeFinishedStays } from "@/lib/queries/bookings";
import { getRoomsByTenant } from "@/lib/queries/rooms";
import { STATUS_LABELS } from "@/lib/calendar";
import type { BookingStatus, BookingFilters } from "@/lib/queries/bookings";
import {
  Card,
  ChannelTag,
  EmptyState,
  GhostButton,
  GuestAvatar,
  PageHeader,
  PrimaryButton,
  StatusBadge,
} from "@/components/admin/ui";

function fmtDate(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// Table cell on xl+, plain grid item in the mobile card.
const CELL = "xl:table-cell xl:px-4 xl:py-[13px]";

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; roomId?: string }>;
}) {
  const { tenantId } = await requireSession();
  await completeFinishedStays(tenantId);
  const params = await searchParams;

  const filters: BookingFilters = {
    status: params.status as BookingStatus | undefined,
    roomId: params.roomId,
  };

  const [reservations, chambres] = await Promise.all([
    getBookingsByTenant(tenantId, filters),
    getRoomsByTenant(tenantId),
  ]);

  const statusFilters: (BookingStatus | "all")[] = [
    "all",
    "confirmed",
    "pending",
    "completed",
    "cancelled",
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Réservations"
        subtitle={`${reservations.length} réservation${reservations.length > 1 ? "s" : ""}`}
        action={
          <PrimaryButton href="/admin/reservations/new">Nouvelle</PrimaryButton>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1.5 overflow-x-auto md:flex-wrap -mx-5 px-5 sm:-mx-8 sm:px-8 md:mx-0 md:px-0 pb-1 md:pb-0 admin-scroll-cue">
          {statusFilters.map((s) => {
            const href =
              s === "all"
                ? params.roomId
                  ? `/admin/reservations?roomId=${params.roomId}`
                  : "/admin/reservations"
                : `/admin/reservations?status=${s}${params.roomId ? `&roomId=${params.roomId}` : ""}`;
            const active =
              s === "all" ? !params.status : params.status === s;
            return (
              <GhostButton key={s} href={href} active={active}>
                {s === "all" ? "Toutes" : STATUS_LABELS[s as BookingStatus]}
              </GhostButton>
            );
          })}
        </div>
      </div>

      {/* Room chips */}
      {chambres.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto md:flex-wrap -mx-5 px-5 sm:-mx-8 sm:px-8 md:mx-0 md:px-0 pb-1 md:pb-0 admin-scroll-cue">
          <Link
            href={`/admin/reservations${params.status ? `?status=${params.status}` : ""}`}
            className="text-[12px] font-semibold rounded-md px-2.5 py-[5px] transition-colors whitespace-nowrap flex-shrink-0"
            style={{
              background: !params.roomId
                ? "var(--admin-primary-light)"
                : "transparent",
              color: !params.roomId
                ? "var(--admin-primary)"
                : "var(--admin-text-muted)",
              border: `1px solid ${!params.roomId ? "var(--admin-primary-light)" : "var(--admin-border)"}`,
            }}
          >
            Toutes les chambres
          </Link>
          {chambres.map((c) => {
            const active = params.roomId === c.id;
            return (
              <Link
                key={c.id}
                href={`/admin/reservations?roomId=${c.id}${params.status ? `&status=${params.status}` : ""}`}
                className="text-[12px] font-semibold rounded-md px-2.5 py-[5px] transition-colors whitespace-nowrap flex-shrink-0"
                style={{
                  background: active ? "var(--admin-primary-light)" : "transparent",
                  color: active
                    ? "var(--admin-primary)"
                    : "var(--admin-text-muted)",
                  border: `1px solid ${active ? "var(--admin-primary-light)" : "var(--admin-border)"}`,
                }}
              >
                {c.name}
              </Link>
            );
          })}
        </div>
      )}

      {/* Table */}
      {reservations.length === 0 ? (
        <Card>
          {filters.status || filters.roomId ? (
            <EmptyState
              title="Aucune réservation ne correspond à ce filtre"
              action={
                <GhostButton href="/admin/reservations">Voir toutes les réservations</GhostButton>
              }
            >
              Essayez un autre statut ou une autre chambre.
            </EmptyState>
          ) : (
            <EmptyState
              title="Aucune réservation pour l’instant"
              example="un client vous appelle pour 2 nuits la semaine prochaine : saisissez-le ici pour bloquer les dates sur votre site."
              action={
                <PrimaryButton href="/admin/reservations/new">Saisir une réservation</PrimaryButton>
              }
            >
              Les réservations faites sur votre site arrivent ici automatiquement. Vous pouvez aussi
              saisir celles prises par téléphone ou sur une autre plateforme.
            </EmptyState>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* One DOM for both layouts: a table from xl up, stacked cards below. */}
          <div className="xl:overflow-x-auto">
            <table className="w-full border-collapse block xl:table">
              <thead className="hidden xl:table-header-group">
                <tr style={{ borderBottom: "1px solid var(--admin-border)" }}>
                  {[
                    "Client",
                    "Chambre",
                    "Arrivée",
                    "Départ",
                    "Montant",
                    "Canal",
                    "Statut",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[12px] font-bold uppercase tracking-[0.06em] whitespace-nowrap"
                      style={{
                        padding: "12px 16px",
                        color: "var(--admin-text-muted)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="block xl:table-row-group">
                {reservations.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`relative grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3.5 xl:table-row xl:p-0 hover:bg-[var(--admin-surface-2)]/60 transition-colors ${
                      i % 2 === 0 ? "" : "xl:bg-[var(--admin-surface-2)]"
                    }`}
                    style={{ borderBottom: "1px solid var(--admin-border-light)" }}
                  >
                    <td className={`${CELL} block min-w-0`}>
                      <Link
                        href={`/admin/reservations/${r.id}`}
                        className="flex items-center gap-2.5 hover:opacity-80 after:absolute after:inset-0"
                      >
                        <GuestAvatar name={r.guestName} size={30} />
                        <span
                          className="text-[14px] xl:text-[13.5px] font-semibold min-w-0 break-words xl:max-w-[200px]"
                          style={{ color: "var(--admin-text)" }}
                        >
                          {r.guestName}
                        </span>
                      </Link>
                    </td>
                    <td
                      className={`${CELL} block col-span-2 text-[13px] xl:whitespace-nowrap`}
                      style={{ color: "var(--admin-text)" }}
                    >
                      {r.room?.name ?? "—"}
                      <span
                        className="xl:hidden tabular-nums"
                        style={{ color: "var(--admin-text-muted)" }}
                      >
                        {" · "}
                        {fmtDate(new Date(r.checkIn))} → {fmtDate(new Date(r.checkOut))}
                      </span>
                    </td>
                    <td
                      className={`${CELL} hidden text-[13px] whitespace-nowrap tabular-nums`}
                      style={{ color: "var(--admin-text)" }}
                    >
                      {fmtDate(new Date(r.checkIn))}
                    </td>
                    <td
                      className={`${CELL} hidden text-[13px] whitespace-nowrap tabular-nums`}
                      style={{ color: "var(--admin-text)" }}
                    >
                      {fmtDate(new Date(r.checkOut))}
                    </td>
                    <td
                      className={`${CELL} block text-[13.5px] font-bold whitespace-nowrap tabular-nums`}
                      style={{ color: "var(--admin-text)" }}
                    >
                      {formatEuros(r.totalPrice)}
                    </td>
                    <td className={`${CELL} block justify-self-end whitespace-nowrap`}>
                      <ChannelTag channel={r.source ?? "manual"} />
                    </td>
                    <td className={`${CELL} block col-start-2 row-start-1 justify-self-end`}>
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
