import { eq, asc } from "drizzle-orm";
import { headers } from "next/headers";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { tenants, rooms, icalSources } from "@/db/schema";
import StripeConnectSection from "@/components/admin/StripeConnectSection";
import IcalSourcesSection from "@/components/admin/IcalSourcesSection";
import LocationSection from "@/components/admin/LocationSection";
import EmailSettingsSection from "@/components/admin/EmailSettingsSection";
import type { TenantConfig } from "@/lib/tenant-context";

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
      config: tenants.config,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const config = (tenant.config ?? {}) as TenantConfig;

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
    <div className="space-y-10">
      <div>
        <h1
          className="text-[24px] font-extrabold tracking-[-0.6px]"
          style={{ color: "var(--admin-text)" }}
        >
          Paramètres
        </h1>
        <p
          className="text-[14px] mt-1"
          style={{ color: "var(--admin-text-muted)" }}
        >
          {tenant.name}
        </p>
      </div>

      <EmailSettingsSection
        confirmationMessage={config.confirmationMessage}
        postStayMessage={config.postStayMessage}
        reviewUrl={config.reviewUrl}
      />

      <LocationSection
        googleMapsUrl={config.googleMapsUrl}
        latitude={config.latitude}
        longitude={config.longitude}
      />

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
