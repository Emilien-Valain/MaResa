import type { TenantConfig } from "@/lib/tenant-context";
import ClassicHomeStory from "@/components/public/templates/classic/HomeStory";
import BoutiqueHomeStory from "@/components/public/templates/boutique/HomeStory";

export default function HomeStory({ config }: { config: TenantConfig }) {
  if (config.template === "boutique") {
    return <BoutiqueHomeStory config={config} />;
  }
  return <ClassicHomeStory config={config} />;
}
