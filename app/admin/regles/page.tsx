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
    <div className="space-y-6 admin-fade-in">
      <header>
        <h1
          className="text-[22px] font-extrabold"
          style={{ color: "var(--admin-text)", letterSpacing: "-0.5px" }}
        >
          Règles
        </h1>
        <p
          className="text-[13.5px] mt-1"
          style={{ color: "var(--admin-text-muted)" }}
        >
          Contraintes de réservation, prix variables et blocages de calendrier.
        </p>
      </header>

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
