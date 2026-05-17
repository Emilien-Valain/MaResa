import type { Tenant, TenantConfig } from "@/lib/tenant-context";
import ClassicHomeHero from "@/components/public/templates/classic/HomeHero";
import BoutiqueHomeHero from "@/components/public/templates/boutique/HomeHero";

export default function HomeHero({
  tenant,
  config,
}: {
  tenant: Tenant;
  config: TenantConfig;
}) {
  if (config.template === "boutique") {
    return <BoutiqueHomeHero tenant={tenant} config={config} />;
  }
  return <ClassicHomeHero tenant={tenant} config={config} />;
}
