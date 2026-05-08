import Link from "next/link";
import Image from "next/image";
import { requireSession } from "@/lib/session";
import { getRoomsByTenant } from "@/lib/queries/rooms";
import DeleteRoomButton from "@/components/admin/DeleteRoomButton";
import { Card, PageHeader, PrimaryButton } from "@/components/admin/ui";

function fmtCurrency(n: number) {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default async function ChambresPage() {
  const { tenantId } = await requireSession();
  const chambres = await getRoomsByTenant(tenantId);

  const activeCount = chambres.filter((c) => c.active).length;
  const inactiveCount = chambres.length - activeCount;
  const potentialRevenue = chambres
    .filter((c) => c.active)
    .reduce((s, c) => s + Number(c.pricePerNight), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chambres"
        subtitle={
          <>
            <span className="font-semibold text-emerald-700">
              {activeCount} active{activeCount > 1 ? "s" : ""}
            </span>
            {inactiveCount > 0 && (
              <span style={{ color: "var(--admin-text-subtle)" }}>
                {" · "}
                {inactiveCount} inactive{inactiveCount > 1 ? "s" : ""}
              </span>
            )}
          </>
        }
        action={
          <PrimaryButton href="/admin/chambres/new">
            Ajouter une chambre
          </PrimaryButton>
        }
      />

      {chambres.length > 0 && (
        <div className="flex gap-3.5 flex-wrap">
          <StatTile label="Chambres totales" value={String(chambres.length)} />
          <StatTile
            label="Revenu potentiel/nuit"
            value={fmtCurrency(potentialRevenue)}
            accent
          />
          <StatTile
            label="Capacité totale"
            value={`${chambres
              .filter((c) => c.active)
              .reduce((s, c) => s + c.capacity, 0)} pers.`}
          />
        </div>
      )}

      {chambres.length === 0 ? (
        <Card style={{ padding: "60px 24px", textAlign: "center" }}>
          <p
            className="text-[14px]"
            style={{ color: "var(--admin-text-muted)" }}
          >
            Aucune chambre pour l&apos;instant.
          </p>
          <Link
            href="/admin/chambres/new"
            className="text-[13px] font-semibold underline mt-3 inline-block"
            style={{ color: "var(--admin-primary)" }}
          >
            Créer la première
          </Link>
        </Card>
      ) : (
        <div className="grid gap-[18px] grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {chambres.map((chambre) => {
            const photos = Array.isArray(chambre.photos)
              ? (chambre.photos as { url: string }[])
              : [];
            const thumb = photos[0];
            const isActive = chambre.active;
            return (
              <div
                key={chambre.id}
                data-room-name={chambre.name}
                className="overflow-hidden transition-all"
                style={{
                  background: "var(--admin-surface)",
                  border: "1.5px solid var(--admin-border)",
                  borderRadius: "var(--admin-radius)",
                  opacity: isActive ? 1 : 0.7,
                  boxShadow: "var(--admin-shadow-sm)",
                }}
              >
                <div
                  className="relative h-40"
                  style={{
                    background: isActive
                      ? "var(--admin-primary-light)"
                      : "var(--admin-surface-2)",
                    borderBottom: "1px solid var(--admin-border-light)",
                  }}
                >
                  {thumb ? (
                    <Image
                      src={thumb.url}
                      alt={chambre.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 320px"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="text-4xl opacity-25">🛏</div>
                      <div
                        className="text-[11px] mt-1.5 font-mono"
                        style={{ color: "var(--admin-text-subtle)" }}
                      >
                        photo · {chambre.name}
                      </div>
                    </div>
                  )}
                  <div
                    className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11.5px] font-bold"
                    style={{
                      background: isActive ? "#DCFCE7" : "#F1F5F9",
                      color: isActive ? "#15803D" : "#64748B",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: isActive ? "#16A34A" : "#94A3B8" }}
                    />
                    {isActive ? "Active" : "Inactive"}
                  </div>
                  <div className="absolute bottom-3 left-3 rounded-lg px-2.5 py-1 backdrop-blur-sm bg-black/55">
                    <span className="text-white text-[13px] font-bold">
                      {fmtCurrency(Number(chambre.pricePerNight))}
                      <span className="font-normal text-[11px] opacity-80">
                        /nuit
                      </span>
                    </span>
                  </div>
                </div>

                <div className="px-[18px] py-4">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="min-w-0">
                      <div
                        className="text-[15px] font-extrabold tracking-tight truncate"
                        style={{ color: "var(--admin-text)" }}
                      >
                        {chambre.name}
                      </div>
                      <div
                        className="text-[12.5px] mt-0.5"
                        style={{ color: "var(--admin-text-muted)" }}
                      >
                        {chambre.capacity} pers.
                      </div>
                    </div>
                    <Link
                      href={`/admin/chambres/${chambre.id}/edit`}
                      className="text-[12.5px] font-semibold rounded-md px-3 py-1.5 whitespace-nowrap"
                      style={{
                        background: "var(--admin-surface-2)",
                        border: "1px solid var(--admin-border)",
                        color: "var(--admin-text-muted)",
                      }}
                    >
                      Modifier
                    </Link>
                  </div>

                  {chambre.description && (
                    <p
                      className="text-[12.5px] leading-[1.55] mb-3 line-clamp-2"
                      style={{ color: "var(--admin-text-muted)" }}
                    >
                      {chambre.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <Link
                      href={`/admin/chambres/${chambre.id}`}
                      className="text-[12.5px] font-semibold"
                      style={{ color: "var(--admin-primary)" }}
                    >
                      Détails →
                    </Link>
                    <DeleteRoomButton id={chambre.id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="flex-1 min-w-[180px]"
      style={{
        background: "var(--admin-surface)",
        border: "1px solid var(--admin-border)",
        borderRadius: 10,
        padding: "12px 18px",
      }}
    >
      <div
        className="text-[11.5px] font-semibold uppercase tracking-[0.06em] mb-1"
        style={{ color: "var(--admin-text-muted)" }}
      >
        {label}
      </div>
      <div
        className="text-[20px] font-extrabold"
        style={{
          color: accent ? "var(--admin-primary)" : "var(--admin-text)",
          letterSpacing: "-0.5px",
        }}
      >
        {value}
      </div>
    </div>
  );
}
