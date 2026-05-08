import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getBookingsByTenant } from "@/lib/queries/bookings";
import { getRoomsByTenant } from "@/lib/queries/rooms";
import { STATUS_LABELS } from "@/lib/calendar";
import type { BookingStatus, BookingFilters } from "@/lib/queries/bookings";
import {
  Card,
  ChannelTag,
  GhostButton,
  GuestAvatar,
  PageHeader,
  PrimaryButton,
  StatusBadge,
} from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";

function fmtDate(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function fmtCurrency(n: number) {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; roomId?: string }>;
}) {
  const { tenantId } = await requireSession();
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
        <div className="flex gap-1.5 flex-wrap">
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
        <div className="flex gap-1.5 flex-wrap">
          <Link
            href={`/admin/reservations${params.status ? `?status=${params.status}` : ""}`}
            className="text-[12px] font-semibold rounded-md px-2.5 py-[5px] transition-colors"
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
                className="text-[12px] font-semibold rounded-md px-2.5 py-[5px] transition-colors"
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
        <Card style={{ padding: "60px 24px", textAlign: "center" }}>
          <p
            className="text-[14px]"
            style={{ color: "var(--admin-text-muted)" }}
          >
            Aucune réservation.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--admin-border)" }}>
                  {[
                    "Référence",
                    "Client",
                    "Chambre",
                    "Arrivée",
                    "Départ",
                    "Montant",
                    "Canal",
                    "Statut",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[11.5px] font-bold uppercase tracking-[0.06em] whitespace-nowrap"
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
              <tbody>
                {reservations.map((r, i) => (
                  <tr
                    key={r.id}
                    className="hover:bg-[var(--admin-surface-2)]/60 transition-colors"
                    style={{
                      borderBottom: "1px solid var(--admin-border-light)",
                      background:
                        i % 2 === 0 ? "transparent" : "var(--admin-surface-2)",
                    }}
                  >
                    <td
                      className="text-[12.5px] font-bold whitespace-nowrap"
                      style={{
                        padding: "13px 16px",
                        color: "var(--admin-text-muted)",
                        fontFamily:
                          "var(--font-mono), ui-monospace, Menlo, monospace",
                      }}
                    >
                      {r.id.slice(0, 8)}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <Link
                        href={`/admin/reservations/${r.id}`}
                        className="flex items-center gap-2.5 hover:opacity-80"
                      >
                        <GuestAvatar name={r.guestName} size={30} />
                        <span
                          className="text-[13.5px] font-semibold whitespace-nowrap"
                          style={{ color: "var(--admin-text)" }}
                        >
                          {r.guestName}
                        </span>
                      </Link>
                    </td>
                    <td
                      className="text-[13px] whitespace-nowrap"
                      style={{ padding: "13px 16px", color: "var(--admin-text)" }}
                    >
                      {r.room?.name ?? "—"}
                    </td>
                    <td
                      className="text-[13px] whitespace-nowrap tabular-nums"
                      style={{ padding: "13px 16px", color: "var(--admin-text)" }}
                    >
                      {fmtDate(new Date(r.checkIn))}
                    </td>
                    <td
                      className="text-[13px] whitespace-nowrap tabular-nums"
                      style={{ padding: "13px 16px", color: "var(--admin-text)" }}
                    >
                      {fmtDate(new Date(r.checkOut))}
                    </td>
                    <td
                      className="text-[13.5px] font-bold whitespace-nowrap tabular-nums"
                      style={{ padding: "13px 16px", color: "var(--admin-text)" }}
                    >
                      {fmtCurrency(Number(r.totalPrice))}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <ChannelTag channel={r.source ?? "manual"} />
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <Link
                        href={`/admin/reservations/${r.id}`}
                        aria-label="Voir le détail"
                        className="inline-flex items-center hover:opacity-70"
                        style={{ color: "var(--admin-text-muted)" }}
                      >
                        <Icon.Eye size={15} />
                      </Link>
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
