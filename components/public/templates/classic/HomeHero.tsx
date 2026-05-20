import HomeSearch from "@/components/public/HomeSearch";
import type { Tenant, TenantConfig } from "@/lib/tenant-context";

export default function ClassicHomeHero({
  tenant,
  config,
}: {
  tenant: Tenant;
  config: TenantConfig;
}) {
  const eyebrow = config.heroEyebrow;
  const title = config.heroTitle ?? tenant.name;
  const subtitle = config.heroSubtitle;
  const photoUrl = config.heroPhoto?.url;

  return (
    <section
      className="relative px-6 py-20 sm:py-24 text-center overflow-hidden"
      style={{ background: "var(--color-primary)", color: "#fff" }}
    >
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: photoUrl
            ? "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.65))"
            : "radial-gradient(circle at 20% 50%, color-mix(in oklch, var(--color-secondary) 15%, transparent), transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05), transparent 40%)",
        }}
      />

      <div className="relative max-w-3xl mx-auto">
        {eyebrow && (
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 animate-fade-up"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <span className="block w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-secondary)" }} />
            <span
              className="text-[12px] font-semibold tracking-[0.08em] uppercase"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              {eyebrow}
            </span>
          </div>
        )}

        <h1
          className="font-heading font-semibold leading-[1.15] mb-4 animate-fade-up stagger-1"
          style={{ fontSize: "clamp(32px, 5vw, 56px)", letterSpacing: "-0.01em" }}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            className="text-lg mb-12 mx-auto max-w-xl leading-[1.7] animate-fade-up stagger-2"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            {subtitle}
          </p>
        )}

        <div className="animate-fade-up stagger-3">
          <HomeSearch tenantId={tenant.id} template="classic" />
        </div>
      </div>
    </section>
  );
}
