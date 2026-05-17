import { notFound } from "next/navigation";
import PublicLayout from "@/components/public/PublicLayout";
import BookingFormSection from "@/components/public/sections/BookingFormSection";
import { requireTenant } from "@/lib/tenant-context";
import { getRoomByIdPublic } from "@/lib/queries/public";
import { getMinPricePerNight } from "@/lib/pricing";
import type { TenantConfig } from "@/lib/tenant-context";

export default async function ReserverPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const tenant = await requireTenant();
  const config = (tenant.config ?? {}) as TenantConfig;

  const room = await getRoomByIdPublic(tenant.id, roomId);

  if (!room) {
    notFound();
  }

  const minPrice = await getMinPricePerNight(room.id, tenant.id);

  return (
    <PublicLayout>
      <BookingFormSection
        room={{
          id: room.id,
          name: room.name,
          slug: room.slug,
          pricePerNight: room.pricePerNight,
          capacity: room.capacity,
        }}
        tenant={tenant}
        config={config}
        minPrice={minPrice}
      />
    </PublicLayout>
  );
}
