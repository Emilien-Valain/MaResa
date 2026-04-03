import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getDashboardData } from "@/lib/queries/dashboard";

const CHANNEL_LABELS: Record<string, string> = {
  direct: "Site direct",
  manual: "Manuel",
  airbnb: "Airbnb",
  booking: "Booking.com",
  ical: "iCal",
};

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

  const totalBookingsThisMonth = channels.reduce((acc, c) => acc + c.count, 0);

  return (
    <div className="space-y-8 animate-fade-up">
      <h1 className="font-heading text-3xl font-semibold text-warm-950">Dashboard</h1>

      {/* ── Raccourcis ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/chambres"
          className="block p-5 bg-white rounded-sm border border-warm-300 hover:border-warm-500 shadow-sm transition-colors group"
        >
          <p className="text-sm font-semibold text-warm-950 group-hover:text-amber-accent transition-colors">
            Chambres
          </p>
          <p className="text-xs text-warm-500 mt-1">Gérer le catalogue</p>
        </Link>
        <Link
          href="/admin/reservations/new"
          className="block p-5 bg-white rounded-sm border border-warm-300 hover:border-warm-500 shadow-sm transition-colors group"
        >
          <p className="text-sm font-semibold text-warm-950 group-hover:text-amber-accent transition-colors">
            Nouvelle réservation
          </p>
          <p className="text-xs text-warm-500 mt-1">Créer manuellement</p>
        </Link>
        <Link
          href="/admin/calendrier"
          className="block p-5 bg-white rounded-sm border border-warm-300 hover:border-warm-500 shadow-sm transition-colors group"
        >
          <p className="text-sm font-semibold text-warm-950 group-hover:text-amber-accent transition-colors">
            Calendrier
          </p>
          <p className="text-xs text-warm-500 mt-1">Vue mensuelle</p>
        </Link>
      </div>
      {/* ── KPIs ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Occupation */}
        <div className="bg-white border border-warm-300 rounded-sm p-5 shadow-sm">
          <p className="text-xs font-medium text-warm-500 uppercase tracking-wide">
            Occupation aujourd&apos;hui
          </p>
          <p className="font-heading text-3xl font-semibold text-warm-950 mt-2">
            {occupancy.rate}%
          </p>
          <p className="text-xs text-warm-400 mt-1">
            {occupancy.occupied}/{occupancy.total} chambre{occupancy.total > 1 ? "s" : ""}
          </p>
        </div>

        {/* CA jour */}
        <div className="bg-white border border-warm-300 rounded-sm p-5 shadow-sm">
          <p className="text-xs font-medium text-warm-500 uppercase tracking-wide">
            CA aujourd&apos;hui
          </p>
          <p className="font-heading text-3xl font-semibold text-warm-950 mt-2">
            {formatCurrency(revenue.day)}
          </p>
        </div>

        {/* CA semaine */}
        <div className="bg-white border border-warm-300 rounded-sm p-5 shadow-sm">
          <p className="text-xs font-medium text-warm-500 uppercase tracking-wide">
            CA cette semaine
          </p>
          <p className="font-heading text-3xl font-semibold text-warm-950 mt-2">
            {formatCurrency(revenue.week)}
          </p>
        </div>

        {/* CA mois */}
        <div className="bg-white border border-warm-300 rounded-sm p-5 shadow-sm">
          <p className="text-xs font-medium text-warm-500 uppercase tracking-wide">
            CA ce mois
          </p>
          <p className="font-heading text-3xl font-semibold text-warm-950 mt-2">
            {formatCurrency(revenue.month)}
          </p>
        </div>
      </div>

      {/* ── Canaux + Arrivées/Départs ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Répartition par canal */}
        <div className="bg-white border border-warm-300 rounded-sm shadow-sm">
          <div className="px-5 py-4 border-b border-warm-200">
            <h2 className="text-sm font-semibold text-warm-950">
              Réservations par canal
            </h2>
            <p className="text-xs text-warm-400">Ce mois</p>
          </div>
          <div className="px-5 py-4">
            {channels.length === 0 ? (
              <p className="text-sm text-warm-400 text-center py-4">
                Aucune réservation ce mois
              </p>
            ) : (
              <div className="space-y-3">
                {channels.map((ch) => {
                  const pct =
                    totalBookingsThisMonth > 0
                      ? Math.round((ch.count / totalBookingsThisMonth) * 100)
                      : 0;
                  return (
                    <div key={ch.source}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-warm-700">
                          {CHANNEL_LABELS[ch.source] ?? ch.source}
                        </span>
                        <span className="text-warm-500 tabular-nums">
                          {ch.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-warm-700 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Prochaines arrivées */}
        <div className="bg-white border border-warm-300 rounded-sm shadow-sm">
          <div className="px-5 py-4 border-b border-warm-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-warm-950">
                Prochaines arrivées
              </h2>
              <p className="text-xs text-warm-400">{checkIns.length} à venir</p>
            </div>
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-sm px-2 py-0.5">
              Check-in
            </span>
          </div>
          <div className="divide-y divide-warm-100">
            {checkIns.length === 0 ? (
              <p className="text-sm text-warm-400 text-center py-6">
                Aucune arrivée prévue
              </p>
            ) : (
              checkIns.map((b) => (
                <Link
                  key={b.id}
                  href={`/admin/reservations/${b.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-warm-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-warm-900">
                      {b.guestName}
                    </p>
                    <p className="text-xs text-warm-400">{b.room?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm tabular-nums text-warm-700">
                      {formatDate(new Date(b.checkIn))}
                    </p>
                    <StatusBadge status={b.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Prochains départs */}
        <div className="bg-white border border-warm-300 rounded-sm shadow-sm">
          <div className="px-5 py-4 border-b border-warm-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-warm-950">
                Prochains départs
              </h2>
              <p className="text-xs text-warm-400">{checkOuts.length} à venir</p>
            </div>
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-2 py-0.5">
              Check-out
            </span>
          </div>
          <div className="divide-y divide-warm-100">
            {checkOuts.length === 0 ? (
              <p className="text-sm text-warm-400 text-center py-6">
                Aucun départ prévu
              </p>
            ) : (
              checkOuts.map((b) => (
                <Link
                  key={b.id}
                  href={`/admin/reservations/${b.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-warm-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-warm-900">
                      {b.guestName}
                    </p>
                    <p className="text-xs text-warm-400">{b.room?.name}</p>
                  </div>
                  <p className="text-sm tabular-nums text-warm-700">
                    {formatDate(new Date(b.checkOut))}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "text-amber-700 bg-amber-50",
    confirmed: "text-green-700 bg-green-50",
    completed: "text-warm-500 bg-warm-100",
    cancelled: "text-red-600 bg-red-50",
  };

  const labels: Record<string, string> = {
    pending: "En attente",
    confirmed: "Confirmée",
    completed: "Terminée",
    cancelled: "Annulée",
  };

  return (
    <span className={`text-xs rounded-sm px-1.5 py-0.5 ${styles[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}
