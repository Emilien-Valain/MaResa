import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getDashboardData } from "@/lib/queries/dashboard";
import {
  Card,
  CHANNEL_CONFIG,
  GuestAvatar,
  KPICard,
  PageHeader,
  PrimaryButton,
  SectionHeader,
  StatusBadge,
} from "@/components/admin/ui";

function formatDate(d: Date) {
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatCurrency(n: number) {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default async function AdminDashboard() {
  const { tenantId } = await requireSession();
  const { checkIns, checkOuts, channels, occupancy, revenue } =
    await getDashboardData(tenantId);

  const totalThisMonth = channels.reduce((acc, c) => acc + c.count, 0);
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={<>Bonjour 👋</>}
        subtitle={<span className="capitalize">{today}</span>}
        action={
          <PrimaryButton href="/admin/reservations/new">
            Nouvelle réservation
          </PrimaryButton>
        }
      />

      {/* KPI row */}
      <div className="flex flex-wrap gap-3.5">
        <KPICard
          title="Taux d'occupation"
          value={`${occupancy.rate}%`}
          sub={`${occupancy.occupied}/${occupancy.total} chambre${occupancy.total > 1 ? "s" : ""}`}
          accent
        />
        <KPICard
          title="CA Aujourd'hui"
          value={formatCurrency(revenue.day)}
          sub={`${checkIns.length} arrivée${checkIns.length > 1 ? "s" : ""}`}
        />
        <KPICard
          title="CA Semaine"
          value={formatCurrency(revenue.week)}
          sub="7 derniers jours"
        />
        <KPICard
          title="CA Mois"
          value={formatCurrency(revenue.month)}
          sub="Mois en cours"
        />
        <KPICard
          title="Départs auj."
          value={String(checkOuts.length)}
          sub="Chambres à préparer"
        />
      </div>

      {/* Main grid : channels + arrivals + departures */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Channel breakdown */}
        <Card style={{ padding: "20px 24px" }}>
          <SectionHeader
            title="Réservations par canal"
            subtitle="Ce mois-ci"
          />
          {channels.length === 0 ? (
            <p
              className="text-[13px] text-center py-8"
              style={{ color: "var(--admin-text-muted)" }}
            >
              Aucune réservation ce mois
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {channels.map((ch) => {
                const cfg = CHANNEL_CONFIG[ch.source] ?? CHANNEL_CONFIG.manual;
                const pct =
                  totalThisMonth > 0
                    ? Math.round((ch.count / totalThisMonth) * 100)
                    : 0;
                return (
                  <div key={ch.source}>
                    <div className="flex justify-between text-[13px] mb-1.5">
                      <span
                        className="font-semibold"
                        style={{ color: "var(--admin-text)" }}
                      >
                        {cfg.label}
                      </span>
                      <span
                        className="font-bold tabular-nums"
                        style={{ color: "var(--admin-text)" }}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div
                      className="h-2 rounded overflow-hidden"
                      style={{ background: "var(--admin-surface-2)" }}
                    >
                      <div
                        className="h-full rounded transition-[width] duration-700"
                        style={{
                          width: `${pct}%`,
                          background: cfg.color,
                        }}
                      />
                    </div>
                    <div
                      className="text-[11.5px] mt-1"
                      style={{ color: "var(--admin-text-muted)" }}
                    >
                      {ch.count} réservation{ch.count > 1 ? "s" : ""} ce mois
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Arrivals */}
        <Card style={{ padding: "20px 24px" }} className="arrivals-card">
          <SectionHeader
            title="Prochaines arrivées"
            subtitle={`${checkIns.length} à venir`}
            action={
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.06em] rounded-md px-2 py-[3px]"
                style={{
                  background: "#DCFCE7",
                  color: "#15803D",
                }}
              >
                Check-in
              </span>
            }
          />
          {checkIns.length === 0 ? (
            <p
              className="text-[13px] text-center py-6"
              style={{ color: "var(--admin-text-muted)" }}
            >
              Aucune arrivée prévue
            </p>
          ) : (
            <div>
              {checkIns.slice(0, 6).map((b) => (
                <Link
                  key={b.id}
                  href={`/admin/reservations/${b.id}`}
                  className="flex items-center gap-3 py-2.5 transition-colors hover:opacity-80"
                  style={{
                    borderBottom: "1px solid var(--admin-border-light)",
                  }}
                >
                  <GuestAvatar name={b.guestName} size={36} />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[13.5px] font-semibold truncate"
                      style={{ color: "var(--admin-text)" }}
                    >
                      {b.guestName}
                    </div>
                    <div
                      className="text-[12px] mt-0.5 truncate"
                      style={{ color: "var(--admin-text-muted)" }}
                    >
                      {b.room?.name}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div
                      className="text-[13px] tabular-nums"
                      style={{ color: "var(--admin-text)" }}
                    >
                      {formatDate(new Date(b.checkIn))}
                    </div>
                    <div className="mt-1">
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Departures */}
        <Card style={{ padding: "20px 24px" }} className="departures-card">
          <SectionHeader
            title="Prochains départs"
            subtitle={`${checkOuts.length} à venir`}
            action={
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.06em] rounded-md px-2 py-[3px]"
                style={{
                  background: "var(--admin-accent-light)",
                  color: "var(--admin-accent)",
                }}
              >
                Check-out
              </span>
            }
          />
          {checkOuts.length === 0 ? (
            <p
              className="text-[13px] text-center py-6"
              style={{ color: "var(--admin-text-muted)" }}
            >
              Aucun départ prévu
            </p>
          ) : (
            <div>
              {checkOuts.slice(0, 6).map((b) => (
                <Link
                  key={b.id}
                  href={`/admin/reservations/${b.id}`}
                  className="flex items-center gap-3 py-2.5 transition-colors hover:opacity-80"
                  style={{
                    borderBottom: "1px solid var(--admin-border-light)",
                  }}
                >
                  <GuestAvatar
                    name={b.guestName}
                    size={36}
                    bg="var(--admin-accent-light)"
                    color="var(--admin-accent)"
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[13.5px] font-semibold truncate"
                      style={{ color: "var(--admin-text)" }}
                    >
                      {b.guestName}
                    </div>
                    <div
                      className="text-[12px] mt-0.5 truncate"
                      style={{ color: "var(--admin-text-muted)" }}
                    >
                      {b.room?.name}
                    </div>
                  </div>
                  <div
                    className="text-[13px] tabular-nums flex-shrink-0"
                    style={{ color: "var(--admin-text)" }}
                  >
                    {formatDate(new Date(b.checkOut))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ShortcutCard
          href="/admin/chambres"
          title="Chambres"
          desc="Gérer le catalogue"
        />
        <ShortcutCard
          href="/admin/calendrier"
          title="Calendrier"
          desc="Vue mensuelle"
        />
        <ShortcutCard
          href="/admin/parametres"
          title="Paramètres"
          desc="iCal, Stripe, emails"
        />
      </div>
    </div>
  );
}

function ShortcutCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group block transition-all hover:-translate-y-0.5"
      style={{
        background: "var(--admin-surface)",
        border: "1px solid var(--admin-border)",
        borderRadius: "var(--admin-radius)",
        boxShadow: "var(--admin-shadow-sm)",
        padding: "18px 20px",
      }}
    >
      <p
        className="text-[14px] font-bold transition-colors group-hover:opacity-90"
        style={{ color: "var(--admin-primary)" }}
      >
        {title}
      </p>
      <p
        className="text-[12.5px] mt-1"
        style={{ color: "var(--admin-text-muted)" }}
      >
        {desc}
      </p>
    </Link>
  );
}
