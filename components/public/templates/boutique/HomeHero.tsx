import HomeSearch from "@/components/public/HomeSearch";
import type { Tenant, TenantConfig } from "@/lib/tenant-context";

export default function BoutiqueHomeHero({
  tenant,
  config,
}: {
  tenant: Tenant;
  config: TenantConfig;
}) {
  const eyebrow = config.heroEyebrow ?? "Boutique Hôtel";
  const title = config.heroTitle ?? tenant.name;
  const subtitle =
    config.heroSubtitle ??
    "Choisissez vos dates et trouvez votre chambre.";
  const photoUrl = config.heroPhoto?.url;

  return (
    <section
      className="relative flex flex-col items-center justify-center text-center overflow-hidden px-6"
      style={{
        minHeight: "min(100vh, 760px)",
        background: "var(--color-primary)",
        color: "#fff",
      }}
    >
      {/* Photo de fond optionnelle */}
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
      )}

      {/* Voile dégradé pour la lisibilité */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: photoUrl
            ? "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.7))"
            : "radial-gradient(ellipse 80% 60% at 50% 40%, color-mix(in oklch, var(--color-secondary) 12%, transparent), transparent 60%)",
        }}
      />

      {/* Filets décoratifs latéraux */}
      <div
        aria-hidden="true"
        className="absolute top-[15%] left-[8%] w-px h-[70%] hidden md:block"
        style={{ background: "color-mix(in oklch, var(--color-secondary) 25%, transparent)" }}
      />
      <div
        aria-hidden="true"
        className="absolute top-[15%] right-[8%] w-px h-[70%] hidden md:block"
        style={{ background: "color-mix(in oklch, var(--color-secondary) 25%, transparent)" }}
      />

      <div className="relative z-10 max-w-[780px] py-24">
        <div className="inline-flex items-center gap-3 mb-7 animate-fade-up">
          <span className="block w-7 h-px" style={{ background: "var(--color-secondary)" }} />
          <span
            className="text-[11px] font-medium tracking-[0.22em] uppercase"
            style={{ color: "var(--color-secondary)" }}
          >
            {eyebrow}
          </span>
          <span className="block w-7 h-px" style={{ background: "var(--color-secondary)" }} />
        </div>

        <h1
          className="font-heading font-semibold text-white leading-[1.05] animate-fade-up stagger-1"
          style={{ fontSize: "clamp(44px, 7vw, 82px)", letterSpacing: "-0.01em" }}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            className="mt-6 mx-auto max-w-[480px] text-base leading-[1.8] font-light animate-fade-up stagger-2"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {subtitle}
          </p>
        )}

        <div className="mt-12 animate-fade-up stagger-3">
          <HomeSearch tenantId={tenant.id} template="boutique" />
        </div>
      </div>

      {/* Scroll hint */}
      <div
        aria-hidden="true"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        <span className="text-[10px] tracking-[0.2em] uppercase font-medium">Découvrir</span>
        <span
          className="block w-px h-10"
          style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.35), transparent)" }}
        />
      </div>
    </section>
  );
}
