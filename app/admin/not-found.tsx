import Link from "next/link";
import { Card } from "@/components/admin/ui";

export default function AdminNotFound() {
  return (
    <Card style={{ padding: "40px 28px", maxWidth: 560 }}>
      <h1
        className="text-[24px] font-extrabold leading-tight"
        style={{ color: "var(--admin-text)", letterSpacing: "-0.6px" }}
      >
        Introuvable
      </h1>
      <p className="text-[14px] mt-2 leading-[1.55]" style={{ color: "var(--admin-text-muted)" }}>
        Cette page n&apos;existe pas, ou ce qu&apos;elle affichait (réservation, chambre) a été
        supprimé. Le lien que vous avez suivi est peut-être ancien.
      </p>
      <div className="flex flex-wrap gap-2 mt-6">
        <Link
          href="/admin/reservations"
          className="admin-btn"
          style={{ background: "var(--admin-primary)", color: "#fff", border: "none" }}
        >
          Voir les réservations
        </Link>
        <Link href="/admin" className="admin-btn admin-btn--ghost">
          Tableau de bord
        </Link>
      </div>
    </Card>
  );
}
