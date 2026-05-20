import type { TenantConfig } from "@/lib/tenant-context";

export default function ClassicHomeStats({ config }: { config: TenantConfig }) {
  const stats = config.storyStats ?? [];
  if (stats.length === 0) return null;

  const eyebrow = config.keyStatsEyebrow ?? "En chiffres";
  const title = config.keyStatsTitle ?? "Une maison à taille humaine";

  return (
    <section
      id="chiffres-cles"
      className="px-6 py-16 sm:py-20 bg-white border-y"
      style={{ borderColor: "var(--classic-border)" }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <div
            className="text-[12px] font-semibold tracking-[0.12em] uppercase mb-3 animate-fade-up"
            style={{ color: "var(--color-amber-accent)" }}
          >
            {eyebrow}
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-semibold leading-[1.2] text-warm-900 animate-fade-up stagger-1"
            style={{ letterSpacing: "-0.01em" }}
          >
            {title}
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat, i) => (
            <div
              key={`${stat.label}-${i}`}
              className={`group text-center p-6 sm:p-7 rounded-md border transition-all duration-200 hover:-translate-y-[2px] animate-fade-up stagger-${Math.min(i + 2, 6)}`}
              style={{
                background: "var(--classic-cream)",
                borderColor: "var(--classic-border)",
              }}
            >
              <div
                className="font-heading font-bold leading-none transition-colors group-hover:opacity-90"
                style={{
                  color: "var(--color-primary)",
                  fontSize: "clamp(34px, 4vw, 48px)",
                  letterSpacing: "-0.03em",
                }}
              >
                {stat.value}
              </div>
              <div
                className="mt-3 text-sm font-semibold text-warm-900"
                style={{ letterSpacing: "-0.01em" }}
              >
                {stat.label}
              </div>
              {stat.sub && (
                <div className="mt-1 text-xs text-warm-500 leading-[1.5]">
                  {stat.sub}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
