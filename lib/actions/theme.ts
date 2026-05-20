"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { tenants } from "@/db/schema";
import type { TenantConfig, TemplateName } from "@/lib/tenant-context";

const hexColor = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Couleur HEX invalide (#RRGGBB)");

const themeSchema = z.object({
  template: z.enum(["classic", "boutique"]),
  primaryColor: hexColor,
  secondaryColor: hexColor,
});

export async function updateTheme(formData: FormData) {
  const { tenantId } = await requireSession();

  const raw: Record<string, string | undefined> = {};
  for (const [k, v] of formData.entries()) {
    raw[k] = typeof v === "string" ? v : undefined;
  }

  const data = themeSchema.parse(raw);

  const [tenant] = await db
    .select({ config: tenants.config })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) throw new Error("Tenant introuvable");

  const current = (tenant.config ?? {}) as TenantConfig;

  const nextConfig: TenantConfig = {
    ...current,
    template: data.template as TemplateName,
    primaryColor: data.primaryColor,
    secondaryColor: data.secondaryColor,
  };

  await db
    .update(tenants)
    .set({ config: nextConfig })
    .where(eq(tenants.id, tenantId));

  revalidatePath("/admin/parametres");
  revalidatePath("/");
  revalidatePath("/chambres");
}
