import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/db/schema";

/**
 * Récupère le tenant courant depuis le header x-tenant-id injecté par le proxy.
 * Utilise React cache() pour dédupliquer les appels dans un même rendu.
 * Appelle notFound() si le tenant est absent ou introuvable.
 */
export const requireTenant = cache(async () => {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");

  if (!tenantId) {
    notFound();
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant) {
    notFound();
  }

  return tenant;
});

export type Tenant = Awaited<ReturnType<typeof requireTenant>>;

export type TemplateName = "classic" | "boutique";

export type TenantConfig = {
  primaryColor?: string;
  secondaryColor?: string;
  heroTitle?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  template?: TemplateName;
};
