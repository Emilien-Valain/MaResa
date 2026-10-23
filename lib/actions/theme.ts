"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { tenants } from "@/db/schema";
import { safeParseFormData, type FormResult } from "@/lib/validation";
import type { TemplateName } from "@/lib/tenant-context";
import { mergeTenantConfig } from "@/lib/tenant-config";

const hexColor = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Couleur HEX invalide (#RRGGBB)");

const themeSchema = z.object({
  template: z.enum(["classic", "boutique"]),
  primaryColor: hexColor,
  secondaryColor: hexColor,
});

export async function updateTheme(formData: FormData): Promise<FormResult> {
  const { tenantId } = await requireSession();

  const parsed = safeParseFormData(themeSchema, formData);
  if ("error" in parsed) return parsed;
  const { data } = parsed;

  await db
    .update(tenants)
    .set({
      config: mergeTenantConfig({
        template: data.template as TemplateName,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
      }),
    })
    .where(eq(tenants.id, tenantId));

  revalidatePath("/admin/parametres");
  revalidatePath("/");
  revalidatePath("/chambres");
}
