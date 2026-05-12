import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getRoomByIdAndTenant } from "@/lib/queries/rooms";
import {
  getBookingRulesByRoom,
  getPricingRulesByRoom,
} from "@/lib/queries/rules";
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
    <div className="space-y-6 max-w-xl admin-fade-in">
      <h1
        className="text-[22px] font-extrabold"
        style={{ color: "var(--admin-text)", letterSpacing: "-0.5px" }}
      >
        Modifier — {chambre.name}
      </h1>
      <RoomForm action={updateRoom.bind(null, id)} defaultValues={chambre} />

      <div
        style={{
          background: "var(--admin-surface)",
          border: "1px solid var(--admin-border)",
          borderRadius: "var(--admin-radius)",
          padding: 24,
        }}
      >
        <RoomPhotosUploader roomId={id} initialPhotos={photos} />
      </div>

      <div
        style={{
          background: "var(--admin-surface)",
          border: "1px solid var(--admin-border)",
          borderRadius: "var(--admin-radius)",
          padding: 24,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-[15px] font-extrabold"
            style={{ color: "var(--admin-text)", letterSpacing: "-0.3px" }}
          >
            Règles spécifiques
          </h2>
          <Link
            href="/admin/regles"
            className="text-[12px] font-semibold"
            style={{ color: "var(--admin-primary)" }}
          >
            Gérer toutes les règles →
          </Link>
        </div>

        {roomBookingRules.length === 0 && roomPricingRules.length === 0 ? (
          <p
            className="text-[13px]"
            style={{ color: "var(--admin-text-muted)" }}
          >
            Aucune règle spécifique. Les règles globales s&apos;appliquent.
          </p>
        ) : (
          <div className="space-y-2">
            {roomBookingRules.map((rule) => (
              <div
                key={rule.id}
                className="text-[13px] flex items-center gap-2"
                style={{ color: "var(--admin-text)" }}
              >
                <span
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: 8,
                    height: 8,
                    background: "var(--admin-primary)",
                  }}
                />
                <span>
                  {rule.minStay && `Min ${rule.minStay} nuit(s) `}
                  {rule.maxStay && `Max ${rule.maxStay} nuit(s) `}
                  {Array.isArray(rule.allowedCheckInDays) &&
                    `Arrivée : ${(rule.allowedCheckInDays as number[])
                      .map((d) => DAY_NAMES_FR[d])
                      .join(", ")} `}
                  {Array.isArray(rule.allowedCheckOutDays) &&
                    `Départ : ${(rule.allowedCheckOutDays as number[])
                      .map((d) => DAY_NAMES_FR[d])
                      .join(", ")}`}
                </span>
              </div>
            ))}
            {roomPricingRules.map((rule) => (
              <div
                key={rule.id}
                className="text-[13px] flex items-center gap-2"
                style={{ color: "var(--admin-text)" }}
              >
                <span
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: 8,
                    height: 8,
                    background: "var(--admin-accent)",
                  }}
                />
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
