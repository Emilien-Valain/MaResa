import { Suspense } from "react";
import { eq, asc } from "drizzle-orm";
import { headers } from "next/headers";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { tenants, rooms, icalSources } from "@/db/schema";
import SettingsPageClient from "@/components/admin/SettingsPageClient";
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
      slug: tenants.slug,
      domain: tenants.domain,
      stripeAccountId: tenants.stripeAccountId,
      config: tenants.config,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const config = (tenant.config ?? {}) as TenantConfig;

  const tenantRooms = await db
    .select({ id: rooms.id, name: rooms.name })
    .from(rooms)
    .where(eq(rooms.tenantId, tenantId))
    .orderBy(asc(rooms.name));

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
    <Suspense fallback={null}>
      <SettingsPageClient
        tenant={{
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          domain: tenant.domain,
        }}
        config={config}
        baseUrl={baseUrl}
        rooms={tenantRooms}
        icalSources={sources.map((s) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          active: s.active,
          roomId: s.roomId,
          roomName: s.roomName,
          lastSyncAt: s.lastSyncAt?.toISOString() ?? null,
        }))}
        hasStripeAccount={!!tenant.stripeAccountId}
      />
    </Suspense>
  );
}
