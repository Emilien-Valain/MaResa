import type { Tenant, TenantConfig } from "@/lib/tenant-context";
import NousTrouverMap from "@/components/public/templates/classic/NousTrouverMapClient";

/**
 * Section "Nous trouver" — version Classic du template.
 *
 * Rend une carte stylisée (SVG décoratif, pas une vraie carte) avec un pin sur
 * l'établissement, une carte adresse mise en avant en couleur primaire, et trois
 * cartes pratiques (téléphone / réception / accès).
 *
 * Tout le contenu lisible vient du tenant + config :
 * - `tenant.name`        — nom affiché sur le pin et la carte adresse
 * - `config.address`     — adresse multi-lignes (séparée par \n)
 * - `config.phone`       — affiché dans la carte Téléphone
 * - `config.email`       — affiché en seconde ligne sous le téléphone
 * - `config.checkInTime` / `config.checkOutTime` — affichés dans Réception
 * - `config.accessLines` — liste de chaînes pour la carte Accès
 * - `config.googleMapsUrl`, `config.latitude`, `config.longitude` — lien externe
 *
 * Si aucun lien Maps n'est défini mais qu'on a lat/lng, on génère un lien.
 */

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CompassIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

const ExternalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

type InfoCard = {
  key: string;
  icon: React.ReactNode;
  label: string;
  lines: string[];
};

function StylizedMap() {
  return (
    <svg
      viewBox="0 0 600 420"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    >
      <defs>
        <pattern id="nt-hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#D4E5D9" strokeWidth="1.2" />
        </pattern>
      </defs>
      {/* Land layers */}
      <rect width="600" height="420" fill="#F1F5EE" />
      <path d="M0,260 Q 150,200 320,240 T 600,220 L 600,420 L 0,420 Z" fill="#E3EFE2" />
      <path d="M0,310 Q 200,270 380,300 T 600,290 L 600,420 L 0,420 Z" fill="#D8E8D4" />
      {/* Parcels */}
      <rect x="60" y="80" width="120" height="70" fill="url(#nt-hatch)" opacity="0.7" />
      <rect x="200" y="60" width="90" height="50" fill="url(#nt-hatch)" opacity="0.5" />
      <rect x="380" y="100" width="140" height="80" fill="url(#nt-hatch)" opacity="0.6" />
      <rect x="100" y="180" width="60" height="50" fill="url(#nt-hatch)" opacity="0.4" />
      {/* Forest */}
      <ellipse cx="490" cy="60" rx="70" ry="42" fill="#C8DBC2" opacity="0.7" />
      <ellipse cx="50" cy="40" rx="60" ry="35" fill="#C8DBC2" opacity="0.6" />
      <ellipse cx="540" cy="350" rx="90" ry="50" fill="#C8DBC2" opacity="0.65" />
      {/* River */}
      <path d="M 0,180 Q 150,160 240,200 T 480,210 T 600,180" fill="none" stroke="#B8D4E8" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
      <path d="M 0,180 Q 150,160 240,200 T 480,210 T 600,180" fill="none" stroke="#7FB3D5" strokeWidth="1.5" strokeLinecap="round" />
      {/* Roads */}
      <path d="M 0,330 Q 200,310 360,330 T 600,320" fill="none" stroke="#fff" strokeWidth="8" />
      <path d="M 0,330 Q 200,310 360,330 T 600,320" fill="none" stroke="#D4C8B0" strokeWidth="2.5" strokeDasharray="6,4" />
      <path d="M 340,330 L 320,140" fill="none" stroke="#fff" strokeWidth="5" />
      <path d="M 340,330 L 320,140" fill="none" stroke="#D4C8B0" strokeWidth="1.5" />
    </svg>
  );
}

export default function ClassicNousTrouver({
  tenant,
  config,
}: {
  tenant: Tenant;
  config: TenantConfig;
}) {
  const eyebrow = config.locationEyebrow ?? "Nous trouver";
  const title = config.locationTitle ?? "Au cœur de la région";
  const subtitle =
    config.locationSubtitle ??
    "Un cadre préservé, facilement accessible depuis les grandes villes voisines.";

  const addressLines = (config.address ?? "")
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);

  const checkIn = config.checkInTime ?? "15h — 20h";
  const checkOut = config.checkOutTime ?? "avant 11h";

  const accessLines =
    config.accessLines && config.accessLines.length > 0
      ? config.accessLines
      : ["Parking gratuit sur place"];

  const hasCoords = config.latitude != null && config.longitude != null;

  const mapsUrl =
    config.googleMapsUrl ??
    (hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${config.latitude},${config.longitude}`
      : null);

  const phoneLines: string[] = [];
  if (config.phone) phoneLines.push(config.phone);
  if (config.email) phoneLines.push(config.email);

  const cards: InfoCard[] = [];
  if (phoneLines.length > 0) {
    cards.push({ key: "phone", icon: <PhoneIcon />, label: "Téléphone", lines: phoneLines });
  }
  cards.push({
    key: "reception",
    icon: <ClockIcon />,
    label: "Réception",
    lines: [`Check-in : ${checkIn}`, `Check-out : ${checkOut}`],
  });
  cards.push({
    key: "access",
    icon: <CompassIcon />,
    label: "Accès",
    lines: accessLines,
  });

  return (
    <section
      id="nous-trouver"
      className="px-6 py-16 sm:py-20 border-t bg-white"
      style={{ borderColor: "var(--classic-border)" }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 sm:mb-12 max-w-xl mx-auto">
          <div
            className="text-[12px] font-semibold tracking-[0.12em] uppercase mb-3 animate-fade-up"
            style={{ color: "var(--color-amber-accent)" }}
          >
            {eyebrow}
          </div>
          <h2
            className="font-heading text-3xl sm:text-4xl font-semibold leading-[1.2] text-warm-900 mb-3 animate-fade-up stagger-1"
            style={{ letterSpacing: "-0.01em" }}
          >
            {title}
          </h2>
          <p className="text-warm-500 leading-[1.7] text-[15px] animate-fade-up stagger-2">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 lg:gap-7 items-stretch">
          {/* Carte */}
          <div
            className="relative rounded-lg overflow-hidden border min-h-[340px] sm:min-h-[380px] animate-fade-up stagger-2"
            style={{
              borderColor: "var(--classic-border)",
              background: "#EAF2ED",
            }}
          >
            {hasCoords ? (
              <NousTrouverMap
                latitude={config.latitude!}
                longitude={config.longitude!}
                label={tenant.name}
                primaryColor={config.primaryColor ?? "#1c1917"}
                accentColor="#D4784A"
              />
            ) : (
              <>
                {/* Carte décorative si aucune coordonnée n'est configurée */}
                <StylizedMap />
                <div
                  className="absolute left-1/2 top-1/2 flex flex-col items-center"
                  style={{ transform: "translate(-50%, -100%)", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.18))" }}
                >
                  <div
                    className="bg-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold whitespace-nowrap mb-1.5 border-[1.5px]"
                    style={{ color: "var(--color-primary)", borderColor: "var(--color-primary)" }}
                  >
                    {tenant.name}
                  </div>
                  <svg width="34" height="44" viewBox="0 0 34 44" fill="none" aria-hidden="true">
                    <path
                      d="M17 2C8.7 2 2 8.7 2 17c0 11.3 15 25 15 25s15-13.7 15-25c0-8.3-6.7-15-15-15z"
                      fill="var(--color-amber-accent)"
                      stroke="#fff"
                      strokeWidth="2.5"
                    />
                    <circle cx="17" cy="17" r="5.5" fill="#fff" />
                  </svg>
                  <div className="w-4 h-1 rounded-full bg-black/20 -mt-0.5 blur-[2px]" />
                </div>
              </>
            )}

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3.5 left-3.5 z-[400] bg-white rounded-md px-3.5 py-2 text-xs font-semibold shadow-sm inline-flex items-center gap-1.5 hover:shadow-md transition-shadow"
                style={{ color: "var(--color-primary)" }}
              >
                <ExternalIcon />
                Ouvrir dans Google Maps
              </a>
            )}
          </div>

          {/* Info column */}
          <div className="flex flex-col gap-3.5">
            <div
              className="rounded-lg p-6 sm:p-7 animate-fade-up stagger-3"
              style={{ background: "var(--color-primary)", color: "#fff" }}
            >
              <div
                className="text-[11px] font-bold tracking-[0.12em] uppercase mb-2.5"
                style={{ color: "var(--color-amber-accent)" }}
              >
                Adresse
              </div>
              <div className="font-heading text-[22px] font-bold leading-[1.3] mb-1.5">
                {tenant.name}
              </div>
              {addressLines.length > 0 ? (
                <div className="text-sm opacity-80 leading-[1.65]">
                  {addressLines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              ) : (
                <div className="text-sm opacity-60 italic">
                  Adresse à renseigner dans les paramètres.
                </div>
              )}
            </div>

            {cards.map((c, i) => (
              <div
                key={c.key}
                className={`bg-white rounded-md border p-4 sm:p-[18px] flex gap-3.5 items-start animate-fade-up stagger-${Math.min(i + 4, 6)}`}
                style={{ borderColor: "var(--classic-border)" }}
              >
                <div
                  className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "color-mix(in oklch, var(--color-primary) 12%, white)",
                    color: "var(--color-primary)",
                  }}
                >
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold tracking-[0.08em] uppercase text-warm-500 mb-1">
                    {c.label}
                  </div>
                  {c.lines.map((line, idx) => (
                    <div
                      key={idx}
                      className={`text-[13.5px] leading-[1.5] ${idx === 0 ? "font-semibold text-warm-900" : "text-warm-700"}`}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
