"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { tenants } from "@/db/schema";
import type { TenantConfig } from "@/lib/tenant-context";

const safeText = (max: number) =>
  z.string().max(max).optional().or(z.literal(""));

const generalSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(120),
  email: safeText(120),
  phone: safeText(40),
  address: safeText(200),
});

export async function updateGeneral(formData: FormData) {
  const { tenantId } = await requireSession();

  const raw: Record<string, string | undefined> = {};
  for (const [k, v] of formData.entries()) {
    raw[k] = typeof v === "string" ? v : undefined;
  }

  const data = generalSchema.parse(raw);

  const [tenant] = await db
    .select({ config: tenants.config })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) throw new Error("Tenant introuvable");

  const current = (tenant.config ?? {}) as TenantConfig;

  const nextConfig: TenantConfig = {
    ...current,
    email: data.email?.trim() || undefined,
    phone: data.phone?.trim() || undefined,
    address: data.address?.trim() || undefined,
  };

  await db
    .update(tenants)
    .set({ name: data.name, config: nextConfig })
    .where(eq(tenants.id, tenantId));

  revalidatePath("/admin/parametres");
  revalidatePath("/");
  revalidatePath("/chambres");
}
