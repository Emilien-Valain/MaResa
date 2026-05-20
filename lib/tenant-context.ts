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

export type HeroPhoto = {
  id: string;
  filename: string;
  url: string;
};

export type GalleryPhoto = {
  id: string;
  filename: string;
  url: string;
  caption?: string;
};

export type StoryStat = { value: string; label: string; sub?: string };

export type TenantConfig = {
  primaryColor?: string;
  secondaryColor?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroEyebrow?: string;
  heroPhoto?: HeroPhoto | null;
  galleryPhotos?: GalleryPhoto[];
  storyEyebrow?: string;
  storyTitle?: string;
  storyText?: string;
  storyStats?: StoryStat[];
  keyStatsEyebrow?: string;
  keyStatsTitle?: string;
  locationEyebrow?: string;
  locationTitle?: string;
  locationSubtitle?: string;
  checkInTime?: string;
  checkOutTime?: string;
  accessLines?: string[];
  footerTagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  template?: TemplateName;
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
  confirmationMessage?: string;
  postStayMessage?: string;
  reviewUrl?: string;
};
