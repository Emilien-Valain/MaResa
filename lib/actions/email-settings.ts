"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { tenants } from "@/db/schema";
import { mergeTenantConfig } from "@/lib/tenant-config";

export async function updateEmailSettings(formData: FormData) {
  const { tenantId } = await requireSession();

  const confirmationMessage = formData.get("confirmationMessage")?.toString().trim() || undefined;
  const postStayMessage = formData.get("postStayMessage")?.toString().trim() || undefined;
  const reviewUrl = formData.get("reviewUrl")?.toString().trim() || undefined;

  await db
    .update(tenants)
    .set({ config: mergeTenantConfig({ confirmationMessage, postStayMessage, reviewUrl }) })
    .where(eq(tenants.id, tenantId));

  revalidatePath("/admin/parametres");
}
