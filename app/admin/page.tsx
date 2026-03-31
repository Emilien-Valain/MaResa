import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function AdminDashboard() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bienvenue, {session?.user.name ?? session?.user.email}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/chambres"
          className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-gray-400 transition-colors"
        >
          <p className="text-sm font-medium text-gray-900">Chambres</p>
          <p className="text-xs text-gray-400 mt-1">Gérer le catalogue</p>
        </Link>
        <Link
          href="/admin/reservations"
          className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-gray-400 transition-colors"
        >
          <p className="text-sm font-medium text-gray-900">Réservations</p>
          <p className="text-xs text-gray-400 mt-1">Consulter et gérer</p>
        </Link>
        <Link
          href="/admin/calendrier"
          className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-gray-400 transition-colors"
        >
          <p className="text-sm font-medium text-gray-900">Calendrier</p>
          <p className="text-xs text-gray-400 mt-1">Vue mensuelle</p>
        </Link>
      </div>
    </div>
  );
}
