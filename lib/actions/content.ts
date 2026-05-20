"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { tenants } from "@/db/schema";
import type { TenantConfig } from "@/lib/tenant-context";

const safeText = (max: number) => z.string().max(max).optional().or(z.literal(""));

const contentSchema = z.object({
  heroEyebrow: safeText(120),
  heroTitle: safeText(200),
  heroSubtitle: safeText(500),
  storyEyebrow: safeText(120),
  storyTitle: safeText(200),
  storyText: safeText(2000),
  footerTagline: safeText(200),
  // Stats encodés en JSON : [{value, label}, …]
  storyStats: z.string().max(2000).optional().or(z.literal("")),
});

const statItem = z.object({
  value: z.string().min(1).max(20),
  label: z.string().min(1).max(60),
  sub: z.string().max(80).optional(),
});

function parseStats(raw: string | undefined): TenantConfig["storyStats"] {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    const items = z.array(statItem).max(8).parse(parsed);
    return items.length > 0 ? items : undefined;
  } catch {
    return undefined;
  }
}

export async function updateContent(formData: FormData) {
  const { tenantId } = await requireSession();

  const raw: Record<string, string | undefined> = {};
  for (const [k, v] of formData.entries()) {
    raw[k] = typeof v === "string" ? v : undefined;
  }

  const data = contentSchema.parse(raw);

  const [tenant] = await db
    .select({ config: tenants.config })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) throw new Error("Tenant introuvable");

  const current = (tenant.config ?? {}) as TenantConfig;

  const next: TenantConfig = {
    ...current,
    heroEyebrow: data.heroEyebrow?.trim() || undefined,
    heroTitle: data.heroTitle?.trim() || undefined,
    heroSubtitle: data.heroSubtitle?.trim() || undefined,
    storyEyebrow: data.storyEyebrow?.trim() || undefined,
    storyTitle: data.storyTitle?.trim() || undefined,
    storyText: data.storyText?.trim() || undefined,
    footerTagline: data.footerTagline?.trim() || undefined,
    storyStats: parseStats(data.storyStats),
  };

  await db.update(tenants).set({ config: next }).where(eq(tenants.id, tenantId));

  revalidatePath("/admin/parametres");
  revalidatePath("/");
  revalidatePath("/chambres");
}
