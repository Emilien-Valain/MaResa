import type { Tenant, TenantConfig } from "@/lib/tenant-context";
import ClassicNousTrouver from "@/components/public/templates/classic/NousTrouver";

export default function NousTrouver({
  tenant,
  config,
}: {
  tenant: Tenant;
  config: TenantConfig;
}) {
  // Pour l'instant, seul le template Classic a sa version dédiée. Le template
  // Boutique conserve la LocationMap (Leaflet) traditionnelle ; on n'affiche
  // rien ici pour ne pas dupliquer.
  if (config.template === "boutique") return null;
  return <ClassicNousTrouver tenant={tenant} config={config} />;
}
