import { formatEuros } from "@/lib/utils";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { completeFinishedStays } from "@/lib/queries/bookings";
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

export default async function AdminDashboard() {
  const { tenantId } = await requireSession();
  await completeFinishedStays(tenantId);
  const { today: movements, checkIns, checkOuts, channels, occupancy, monthRevenue } =
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

      {/* Aujourd'hui : la question du matin — qui arrive, qui part */}
      <Card style={{ padding: "20px 24px" }}>
        <SectionHeader title="Aujourd'hui" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <MovementList
            label="Arrivées"
            empty="Personne n'arrive aujourd'hui."
            items={movements.arrivals}
          />
          <MovementList
            label="Départs"
            empty="Aucun départ aujourd'hui."
            items={movements.departures}
            note="Chambre à préparer"
            departure
          />
        </div>
      </Card>

      {/* KPI row */}
      <div className="flex flex-wrap gap-3.5">
        <KPICard
          title="Occupation ce soir"
          value={`${occupancy.rate}%`}
          sub={`${occupancy.occupied} chambre${occupancy.occupied > 1 ? "s" : ""} sur ${occupancy.total}`}
          accent
        />
        <KPICard
          title="Réservé ce mois"
          value={formatEuros(monthRevenue)}
          sub="Réservations confirmées depuis le 1er"
        />
        <KPICard
          title="Réservations ce mois"
          value={String(totalThisMonth)}
          sub="Tous canaux, hors annulations"
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
                      className="text-[12px] mt-1"
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
            subtitle="À partir de demain"
            action={
              <span
                className="text-[12px] font-semibold uppercase tracking-[0.06em] rounded-md px-2 py-[3px]"
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
              Aucune arrivée prévue pour l&apos;instant
            </p>
          ) : (
            <div>
              {checkIns.slice(0, 6).map((b) => (
                <Link
                  key={b.id}
                  href={`/admin/reservations/${b.id}`}
                  className="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-lg transition-colors hover:bg-[var(--admin-surface-2)]"
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
            subtitle="À partir de demain"
            action={
              <span
                className="text-[12px] font-semibold uppercase tracking-[0.06em] rounded-md px-2 py-[3px]"
                style={{
                  background: "var(--admin-accent-light)",
                  color: "var(--admin-accent-text)",
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
              Aucun départ prévu pour l&apos;instant
            </p>
          ) : (
            <div>
              {checkOuts.slice(0, 6).map((b) => (
                <Link
                  key={b.id}
                  href={`/admin/reservations/${b.id}`}
                  className="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-lg transition-colors hover:bg-[var(--admin-surface-2)]"
                  style={{
                    borderBottom: "1px solid var(--admin-border-light)",
                  }}
                >
                  <GuestAvatar
                    name={b.guestName}
                    size={36}
                    bg="var(--admin-accent-light)"
                    color="var(--admin-accent-text)"
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

type Movement = {
  id: string;
  guestName: string;
  room: { name: string } | null;
};

function MovementList({
  label,
  empty,
  items,
  note,
  departure = false,
}: {
  label: string;
  empty: string;
  items: Movement[];
  note?: string;
  departure?: boolean;
}) {
  return (
    <section aria-label={label}>
      <h2
        className="text-[12px] font-semibold uppercase tracking-[0.06em] mb-2"
        style={{ color: "var(--admin-text-muted)" }}
      >
        {label} · <span className="tabular-nums">{items.length}</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-[13px] py-2" style={{ color: "var(--admin-text-muted)" }}>
          {empty}
        </p>
      ) : (
        <ul>
          {items.map((b) => (
            <li key={b.id}>
              <Link
                href={`/admin/reservations/${b.id}`}
                className="flex items-center gap-3 py-2 -mx-2 px-2 rounded-lg transition-colors hover:bg-[var(--admin-surface-2)]"
                style={{ borderBottom: "1px solid var(--admin-border-light)" }}
              >
                <GuestAvatar
                  name={b.guestName}
                  size={32}
                  {...(departure
                    ? { bg: "var(--admin-accent-light)", color: "var(--admin-accent-text)" }
                    : {})}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[13.5px] font-semibold truncate"
                    style={{ color: "var(--admin-text)" }}
                  >
                    {b.guestName}
                  </div>
                  <div
                    className="text-[12px] truncate"
                    style={{ color: "var(--admin-text-muted)" }}
                  >
                    {b.room?.name}
                    {note && ` · ${note}`}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
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
