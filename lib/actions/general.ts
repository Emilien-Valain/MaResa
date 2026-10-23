"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { tenants } from "@/db/schema";
import { safeParseFormData, type FormResult } from "@/lib/validation";
import { mergeTenantConfig } from "@/lib/tenant-config";

const safeText = (max: number) =>
  z.string().max(max).optional().or(z.literal(""));

const generalSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(120),
  email: z.string().trim().email("Adresse email invalide").max(120).optional().or(z.literal("")),
  phone: safeText(40),
  address: safeText(200),
});

export async function updateGeneral(formData: FormData): Promise<FormResult> {
  const { tenantId } = await requireSession();

  const parsed = safeParseFormData(generalSchema, formData);
  if ("error" in parsed) return parsed;
  const { data } = parsed;

  await db
    .update(tenants)
    .set({
      name: data.name,
      config: mergeTenantConfig({
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        address: data.address?.trim() || undefined,
      }),
    })
    .where(eq(tenants.id, tenantId));

  revalidatePath("/admin/parametres");
  revalidatePath("/");
  revalidatePath("/chambres");
}
