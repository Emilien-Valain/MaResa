import { requireTenant } from "@/lib/tenant-context";
import type { TenantConfig } from "@/lib/tenant-context";
import ClassicLayout from "@/components/public/templates/classic/Layout";
import BoutiqueLayout from "@/components/public/templates/boutique/Layout";

/**
 * Dispatcher de templates.
 * Lit config.template depuis le tenant et délègue au bon layout.
 * Ajouter un nouveau template = créer components/public/templates/<name>/Layout.tsx
 * et l'ajouter dans le switch ci-dessous.
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await requireTenant();
  const config = (tenant.config ?? {}) as TenantConfig;

  switch (config.template) {
    case "boutique":
      return <BoutiqueLayout tenant={tenant} config={config}>{children}</BoutiqueLayout>;
    case "classic":
    default:
      return <ClassicLayout tenant={tenant} config={config}>{children}</ClassicLayout>;
  }
}
