import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getRoomByIdAndTenant } from "@/lib/queries/rooms";
import { getBookingRulesByRoom, getPricingRulesByRoom } from "@/lib/queries/rules";
import { updateRoom } from "@/lib/actions/rooms";
import RoomForm from "@/components/admin/RoomForm";
import RoomPhotosUploader from "@/components/admin/RoomPhotosUploader";
import type { RoomPhoto } from "@/app/api/admin/rooms/[id]/photos/route";

const DAY_NAMES_FR = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

export default async function EditChambrePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenantId } = await requireSession();
  const chambre = await getRoomByIdAndTenant(id, tenantId);
  if (!chambre) notFound();

  const photos = (chambre.photos ?? []) as RoomPhoto[];

  const [roomBookingRules, roomPricingRules] = await Promise.all([
    getBookingRulesByRoom(id, tenantId),
    getPricingRulesByRoom(id, tenantId),
  ]);

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="font-heading text-3xl font-semibold text-warm-950">
        Modifier — {chambre.name}
      </h1>
      <RoomForm action={updateRoom.bind(null, id)} defaultValues={chambre} />

      <div className="bg-white p-6 rounded-sm border border-warm-300 shadow-sm">
        <RoomPhotosUploader roomId={id} initialPhotos={photos} />
      </div>

      {/* Règles spécifiques à cette chambre */}
      <div className="bg-white p-6 rounded-sm border border-warm-300 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-warm-950">
            Règles spécifiques
          </h2>
          <Link
            href="/admin/regles"
            className="text-xs text-warm-600 hover:text-warm-900 font-medium"
          >
            Gérer toutes les règles →
          </Link>
        </div>

        {roomBookingRules.length === 0 && roomPricingRules.length === 0 ? (
          <p className="text-sm text-warm-400">
            Aucune règle spécifique. Les règles globales s&apos;appliquent.
          </p>
        ) : (
          <div className="space-y-2">
            {roomBookingRules.map((rule) => (
              <div key={rule.id} className="text-sm text-warm-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span>
                  {rule.minStay && `Min ${rule.minStay} nuit(s) `}
                  {rule.maxStay && `Max ${rule.maxStay} nuit(s) `}
                  {Array.isArray(rule.allowedCheckInDays) &&
                    `Arrivée : ${(rule.allowedCheckInDays as number[]).map((d) => DAY_NAMES_FR[d]).join(", ")} `}
                  {Array.isArray(rule.allowedCheckOutDays) &&
                    `Départ : ${(rule.allowedCheckOutDays as number[]).map((d) => DAY_NAMES_FR[d]).join(", ")}`}
                </span>
              </div>
            ))}
            {roomPricingRules.map((rule) => (
              <div key={rule.id} className="text-sm text-warm-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                <span>
                  {rule.name} —{" "}
                  {rule.fixedPrice
                    ? `${parseFloat(rule.fixedPrice).toFixed(0)} €/nuit`
                    : rule.percentageModifier
                      ? `${parseFloat(rule.percentageModifier) > 0 ? "+" : ""}${parseFloat(rule.percentageModifier).toFixed(0)}%`
                      : ""}
                  {!rule.active && " (désactivée)"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
