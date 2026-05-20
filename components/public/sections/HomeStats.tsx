import type { TenantConfig } from "@/lib/tenant-context";
import ClassicHomeStats from "@/components/public/templates/classic/HomeStats";

export default function HomeStats({ config }: { config: TenantConfig }) {
  // Pour l'instant la section "Chiffres clés" dédiée n'est exposée que sur Classic.
  // Boutique continue d'afficher ses stats dans HomeStory à droite du texte.
  if (config.template === "boutique") return null;
  return <ClassicHomeStats config={config} />;
}
