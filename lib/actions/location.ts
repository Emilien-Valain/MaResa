"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { tenants } from "@/db/schema";
import { locationSchema, safeParseFormData, type FormResult } from "@/lib/validation";
import { mergeTenantConfig } from "@/lib/tenant-config";

export async function updateLocation(formData: FormData): Promise<FormResult> {
  const { tenantId } = await requireSession();

  const parsed = safeParseFormData(locationSchema, formData);
  if ("error" in parsed) return parsed;
  const data = parsed.data;

  await db
    .update(tenants)
    .set({
      config: mergeTenantConfig({
        googleMapsUrl: data.googleMapsUrl || undefined,
        latitude: data.latitude ? parseFloat(data.latitude) : undefined,
        longitude: data.longitude ? parseFloat(data.longitude) : undefined,
      }),
    })
    .where(eq(tenants.id, tenantId));

  revalidatePath("/admin/parametres");
  revalidatePath("/");
}
