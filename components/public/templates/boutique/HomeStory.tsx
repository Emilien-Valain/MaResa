import type { TenantConfig } from "@/lib/tenant-context";

export default function BoutiqueHomeStory({ config }: { config: TenantConfig }) {
  const eyebrow = config.storyEyebrow;
  const title = config.storyTitle;
  const text = config.storyText;
  const stats = config.storyStats ?? [];

  // N'affiche la section que si au moins l'un des champs est rempli
  if (!eyebrow && !title && !text && stats.length === 0) return null;

  return (
    <section className="px-6 py-20" style={{ background: "var(--color-secondary)" }}>
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
        <div>
          {eyebrow && (
            <div
              className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-4 animate-fade-up"
              style={{ color: "var(--color-primary)" }}
            >
              {eyebrow}
            </div>
          )}
          {title && (
            <h2
              className="font-heading font-semibold leading-[1.15] mb-5 animate-fade-up stagger-1"
              style={{ color: "var(--color-primary)", fontSize: "clamp(28px, 4vw, 38px)", letterSpacing: "-0.01em" }}
            >
              {title}
            </h2>
          )}
          {text && (
            <p
              className="text-[15px] leading-[1.8] font-light whitespace-pre-line animate-fade-up stagger-2"
              style={{ color: "color-mix(in oklch, var(--color-primary) 65%, transparent)" }}
            >
              {text}
            </p>
          )}
        </div>

        {stats.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, i) => (
              <div
                key={`${stat.label}-${i}`}
                className={`p-6 border bg-white animate-fade-up stagger-${Math.min(i + 1, 6)}`}
                style={{
                  borderColor: "color-mix(in oklch, var(--color-primary) 15%, transparent)",
                }}
              >
                <div
                  className="font-heading font-bold leading-none"
                  style={{
                    color: "var(--color-primary)",
                    fontSize: "clamp(28px, 3vw, 36px)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {stat.value}
                </div>
                <div
                  className="mt-2 text-[12px] font-medium"
                  style={{ color: "color-mix(in oklch, var(--color-primary) 60%, transparent)" }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
