import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function AdminDashboard() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-3xl font-semibold text-warm-900">Dashboard</h1>
        <p className="text-sm text-warm-500 mt-1">
          Bienvenue, {session?.user.name ?? session?.user.email}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/chambres"
          className="block p-5 bg-white rounded-sm border border-warm-200 hover:border-warm-400 transition-colors group"
        >
          <p className="text-sm font-medium text-warm-900 group-hover:text-amber-accent transition-colors">Chambres</p>
          <p className="text-xs text-warm-400 mt-1">Gérer le catalogue</p>
        </Link>
        <Link
          href="/admin/reservations"
          className="block p-5 bg-white rounded-sm border border-warm-200 hover:border-warm-400 transition-colors group"
        >
          <p className="text-sm font-medium text-warm-900 group-hover:text-amber-accent transition-colors">Réservations</p>
          <p className="text-xs text-warm-400 mt-1">Consulter et gérer</p>
        </Link>
        <Link
          href="/admin/calendrier"
          className="block p-5 bg-white rounded-sm border border-warm-200 hover:border-warm-400 transition-colors group"
        >
          <p className="text-sm font-medium text-warm-900 group-hover:text-amber-accent transition-colors">Calendrier</p>
          <p className="text-xs text-warm-400 mt-1">Vue mensuelle</p>
        </Link>
      </div>
    </div>
  );
}
