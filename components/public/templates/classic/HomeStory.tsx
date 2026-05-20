import type { TenantConfig } from "@/lib/tenant-context";

export default function ClassicHomeStory({ config }: { config: TenantConfig }) {
  const eyebrow = config.storyEyebrow;
  const title = config.storyTitle;
  const text = config.storyText;

  if (!eyebrow && !title && !text) return null;

  return (
    <section
      className="px-6 py-20"
      style={{ background: "var(--classic-cream)" }}
    >
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
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold mb-5 text-warm-900 animate-fade-up stagger-1">
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
      </div>
    </section>
  );
}
