import type { TenantConfig } from "@/lib/tenant-context";

export default function ClassicHomeStory({ config }: { config: TenantConfig }) {
  const eyebrow = config.storyEyebrow;
  const title = config.storyTitle;
  const text = config.storyText;
  const stats = config.storyStats ?? [];

  if (!eyebrow && !title && !text && stats.length === 0) return null;

  return (
    <section className="px-6 py-20 bg-warm-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center max-w-2xl mx-auto">
          {eyebrow && (
            <div
              className="text-[12px] font-semibold tracking-[0.12em] uppercase mb-3 animate-fade-up"
              style={{ color: "var(--color-primary)" }}
            >
              {eyebrow}
            </div>
          )}
          {title && (
            <h2
              className="font-heading text-3xl sm:text-4xl font-semibold mb-5 animate-fade-up stagger-1"
              style={{ color: "var(--color-primary)" }}
            >
              {title}
            </h2>
          )}
          {text && (
            <p
              className="text-warm-600 leading-[1.7] whitespace-pre-line animate-fade-up stagger-2"
            >
              {text}
            </p>
          )}
        </div>

        {stats.length > 0 && (
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div
                key={`${stat.label}-${i}`}
                className={`text-center p-5 bg-white rounded-sm border border-warm-200 animate-fade-up stagger-${Math.min(i + 2, 6)}`}
              >
                <div
                  className="font-heading text-3xl font-semibold leading-none"
                  style={{ color: "var(--color-primary)" }}
                >
                  {stat.value}
                </div>
                <div className="mt-1.5 text-xs font-medium text-warm-500">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
