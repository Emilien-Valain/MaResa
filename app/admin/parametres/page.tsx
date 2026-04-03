import { eq, asc } from "drizzle-orm";
import { headers } from "next/headers";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { tenants, rooms, icalSources } from "@/db/schema";
import StripeConnectSection from "@/components/admin/StripeConnectSection";
import IcalSourcesSection from "@/components/admin/IcalSourcesSection";

export default async function ParametresPage() {
  const { tenantId } = await requireSession();

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;

  const [tenant] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      stripeAccountId: tenants.stripeAccountId,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  // Charger les chambres actives (pour le formulaire d'ajout iCal)
  const tenantRooms = await db
    .select({ id: rooms.id, name: rooms.name })
    .from(rooms)
    .where(eq(rooms.tenantId, tenantId))
    .orderBy(asc(rooms.name));

  // Charger les sources iCal existantes avec le nom de la chambre
  const sources = await db
    .select({
      id: icalSources.id,
      name: icalSources.name,
      url: icalSources.url,
      active: icalSources.active,
      roomId: icalSources.roomId,
      roomName: rooms.name,
      lastSyncAt: icalSources.lastSyncAt,
    })
    .from(icalSources)
    .innerJoin(rooms, eq(icalSources.roomId, rooms.id))
    .where(eq(icalSources.tenantId, tenantId))
    .orderBy(asc(rooms.name), asc(icalSources.name));

  return (
    <div className="space-y-10 animate-fade-up">
      <div>
        <h1 className="font-heading text-3xl font-semibold text-warm-950">Paramètres</h1>
        <p className="text-sm text-warm-600 mt-1">{tenant.name}</p>
      </div>

      <StripeConnectSection hasAccount={!!tenant.stripeAccountId} />

      <IcalSourcesSection
        baseUrl={baseUrl}
        rooms={tenantRooms}
        sources={sources.map((s) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          active: s.active,
          roomId: s.roomId,
          roomName: s.roomName,
          lastSyncAt: s.lastSyncAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
