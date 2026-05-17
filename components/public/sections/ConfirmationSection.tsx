import type { Tenant, TenantConfig } from "@/lib/tenant-context";
import ClassicConfirmationBlock from "@/components/public/templates/classic/ConfirmationBlock";
import BoutiqueConfirmationBlock from "@/components/public/templates/boutique/ConfirmationBlock";

type Props = {
  isPaid: boolean;
  guestName: string;
  guestEmail: string;
  roomName: string | null;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  totalPrice: string;
  reference: string;
  tenant: Tenant;
  config: TenantConfig;
};

export default function ConfirmationSection(props: Props) {
  if (props.config.template === "boutique") {
    return <BoutiqueConfirmationBlock {...props} />;
  }
  return <ClassicConfirmationBlock {...props} />;
}
