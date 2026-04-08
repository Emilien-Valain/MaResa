import { asc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { rooms } from "@/db/schema";
import {
  getManualBlocksByTenant,
  getBookingRulesByTenant,
  getPricingRulesByTenant,
} from "@/lib/queries/rules";
import RulesPageClient from "@/components/admin/RulesPageClient";

export default async function ReglesPage() {
  const { tenantId } = await requireSession();

  const [tenantRooms, manualBlocksList, bookingRulesList, pricingRulesList] =
    await Promise.all([
      db
        .select({ id: rooms.id, name: rooms.name })
        .from(rooms)
        .where(eq(rooms.tenantId, tenantId))
        .orderBy(asc(rooms.name)),
      getManualBlocksByTenant(tenantId),
      getBookingRulesByTenant(tenantId),
      getPricingRulesByTenant(tenantId),
    ]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-3xl font-semibold text-warm-950">
          Règles de réservation
        </h1>
        <p className="text-sm text-warm-600 mt-1">
          Blocages, contraintes de séjour et tarification dynamique
        </p>
      </div>

      <RulesPageClient
        rooms={tenantRooms}
        manualBlocks={manualBlocksList.map((b) => ({
          ...b,
          startDate: b.startDate.toISOString(),
          endDate: b.endDate.toISOString(),
          recurrenceUntil: b.recurrenceUntil?.toISOString() ?? null,
          createdAt: b.createdAt?.toISOString() ?? null,
        }))}
        bookingRules={bookingRulesList.map((r) => ({
          ...r,
          validFrom: r.validFrom?.toISOString() ?? null,
          validTo: r.validTo?.toISOString() ?? null,
          createdAt: r.createdAt?.toISOString() ?? null,
        }))}
        pricingRules={pricingRulesList.map((r) => ({
          ...r,
          validFrom: r.validFrom?.toISOString() ?? null,
          validTo: r.validTo?.toISOString() ?? null,
          createdAt: r.createdAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
