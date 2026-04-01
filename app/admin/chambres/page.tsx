import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getRoomsByTenant } from "@/lib/queries/rooms";
import DeleteRoomButton from "@/components/admin/DeleteRoomButton";

export default async function ChambresPage() {
  const { tenantId } = await requireSession();
  const chambres = await getRoomsByTenant(tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-semibold text-warm-900">Chambres</h1>
        <Link
          href="/admin/chambres/new"
          className="bg-warm-900 text-warm-50 px-4 py-2 rounded-sm text-sm font-medium hover:bg-warm-800 transition-colors"
        >
          Nouvelle chambre
        </Link>
      </div>

      {chambres.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-sm border border-warm-200">
          <p className="text-warm-400 text-sm">Aucune chambre pour l&apos;instant.</p>
          <Link
            href="/admin/chambres/new"
            className="text-sm text-warm-900 font-medium underline mt-2 inline-block"
          >
            Créer la première
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-sm border border-warm-200 divide-y divide-warm-100">
          {chambres.map((chambre) => (
            <div key={chambre.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-warm-900">{chambre.name}</p>
                <p className="text-xs text-warm-400 mt-0.5">
                  {chambre.pricePerNight} €/nuit · {chambre.capacity} pers.
                  {!chambre.active && (
                    <span className="ml-2 text-orange-500">Inactif</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/chambres/${chambre.id}/edit`}
                  className="text-xs text-warm-500 hover:text-warm-900 transition-colors"
                >
                  Modifier
                </Link>
                <DeleteRoomButton id={chambre.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
