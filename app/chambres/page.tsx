import PublicLayout from "@/components/public/PublicLayout";
import RoomListSection from "@/components/public/sections/RoomListSection";
import { requireTenant } from "@/lib/tenant-context";
import { getRoomsPublic } from "@/lib/queries/public";
import { getMinPricePerNight } from "@/lib/pricing";
import type { TenantConfig } from "@/lib/tenant-context";

export default async function ChambresPage() {
  const tenant = await requireTenant();
  const config = (tenant.config ?? {}) as TenantConfig;

  const rawRooms = await getRoomsPublic(tenant.id);
  const rooms = await Promise.all(
    rawRooms.map(async (room) => ({
      ...room,
      minPrice: await getMinPricePerNight(room.id, tenant.id),
    })),
  );

  return (
    <PublicLayout>
      <RoomListSection rooms={rooms} config={config} />
    </PublicLayout>
  );
}
