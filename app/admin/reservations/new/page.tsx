import { requireSession } from "@/lib/session";
import { getRoomsByTenant } from "@/lib/queries/rooms";
import { createBookingManual } from "@/lib/actions/bookings";
import Link from "next/link";
import {
  AdminInput,
  AdminSelect,
  AdminTextarea,
  Field,
} from "@/components/admin/ui";

export default async function NewReservationPage() {
  const { tenantId } = await requireSession();
  const chambres = await getRoomsByTenant(tenantId);

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  return (
    <div className="space-y-6 max-w-xl admin-fade-in">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/reservations"
          className="text-[13px] font-semibold transition-colors"
          style={{ color: "var(--admin-text-muted)" }}
        >
          ← Réservations
        </Link>
      </div>

      <h1
        className="text-[22px] font-extrabold"
        style={{ color: "var(--admin-text)", letterSpacing: "-0.5px" }}
      >
        Nouvelle réservation
      </h1>

      <form
        action={createBookingManual}
        style={{
          background: "var(--admin-surface)",
          border: "1px solid var(--admin-border)",
          borderRadius: "var(--admin-radius)",
          padding: 24,
        }}
      >
        <Field label="Chambre *">
          <AdminSelect name="roomId" required>
            <option value="">Sélectionner…</option>
            {chambres
              .filter((c) => c.active)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.pricePerNight} €/nuit
                </option>
              ))}
          </AdminSelect>
        </Field>

        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Arrivée *">
            <AdminInput
              name="checkIn"
              type="date"
              required
              defaultValue={today}
            />
          </Field>
          <Field label="Départ *">
            <AdminInput
              name="checkOut"
              type="date"
              required
              defaultValue={tomorrow}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Nom client *">
            <AdminInput name="guestName" type="text" required />
          </Field>
          <Field label="Voyageurs *">
            <AdminInput
              name="guestCount"
              type="number"
              min="1"
              required
              defaultValue={1}
            />
          </Field>
        </div>

        <Field label="Email client *">
          <AdminInput name="guestEmail" type="email" required />
        </Field>

        <Field label="Téléphone">
          <AdminInput name="guestPhone" type="tel" />
        </Field>

        <Field label="Notes internes">
          <AdminTextarea name="notes" rows={2} />
        </Field>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            style={{
              padding: "9px 18px",
              background: "var(--admin-primary)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Enregistrer
          </button>
          <Link
            href="/admin/reservations"
            style={{
              padding: "9px 18px",
              color: "var(--admin-text-muted)",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
