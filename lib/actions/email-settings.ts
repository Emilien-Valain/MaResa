"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { tenants } from "@/db/schema";
import type { TenantConfig } from "@/lib/tenant-context";

export async function updateEmailSettings(formData: FormData) {
  const { tenantId } = await requireSession();

  const confirmationMessage = formData.get("confirmationMessage")?.toString().trim() || undefined;
  const postStayMessage = formData.get("postStayMessage")?.toString().trim() || undefined;
  const reviewUrl = formData.get("reviewUrl")?.toString().trim() || undefined;

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
    confirmationMessage,
    postStayMessage,
    reviewUrl,
  };

  await db
    .update(tenants)
    .set({ config: updatedConfig })
    .where(eq(tenants.id, tenantId));

  revalidatePath("/admin/parametres");
}
