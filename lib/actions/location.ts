"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { tenants } from "@/db/schema";
import { locationSchema, parseFormData } from "@/lib/validation";
import type { TenantConfig } from "@/lib/tenant-context";

export async function updateLocation(formData: FormData) {
  const { tenantId } = await requireSession();

  const data = parseFormData(locationSchema, formData);

  const [tenant] = await db
    .select({ config: tenants.config })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    throw new Error("Tenant introuvable");
  }

  const currentConfig = (tenant.config ?? {}) as TenantConfig;

  const updatedConfig: TenantConfig = {
    ...currentConfig,
    googleMapsUrl: data.googleMapsUrl || undefined,
    latitude: data.latitude ? parseFloat(data.latitude) : undefined,
    longitude: data.longitude ? parseFloat(data.longitude) : undefined,
  };

  await db
    .update(tenants)
    .set({ config: updatedConfig })
    .where(eq(tenants.id, tenantId));

  revalidatePath("/admin/parametres");
  revalidatePath("/");
}
