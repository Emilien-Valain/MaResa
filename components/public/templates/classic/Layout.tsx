import type { Tenant, TenantConfig } from "@/lib/tenant-context";
import ClassicHeader from "@/components/public/templates/classic/Header";

export default function ClassicLayout({
  tenant,
  config,
  children,
}: {
  tenant: Tenant;
  config: TenantConfig;
  children: React.ReactNode;
}) {
  const primaryColor = config.primaryColor ?? "#1c1917";
  const secondaryColor = config.secondaryColor ?? "#faf8f5";

  return (
    <div
      style={
        {
          "--color-primary": primaryColor,
          "--color-secondary": secondaryColor,
          // Override des polices pour le template Classic uniquement —
          // Plus Jakarta Sans en body, Playfair Display sur les titres
          // (les composants utilisent `font-sans` / `font-heading` via Tailwind).
          "--font-sans": "var(--font-jakarta)",
          "--font-heading": "var(--font-playfair)",
          fontFamily: "var(--font-jakarta), system-ui, sans-serif",
          // Tokens neutres alignés sur la maquette (cream / border / subtle).
          // Les tokens Tailwind `warm-*` sont plus jaunes — on s'en éloigne
          // ici pour rester fidèle au design (cf. mockup `DirectLoc Booking Flow`).
          "--classic-cream": "#F8F6F3",
          "--classic-border": "#E7E2DA",
          "--classic-muted": "#78716C",
          background: "#F8F6F3",
        } as React.CSSProperties
      }
      className="min-h-screen flex flex-col"
    >
      <ClassicHeader
        tenant={tenant}
        config={config}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer
        className="px-6 py-10 mt-auto border-t"
        style={{
          backgroundColor: "var(--color-primary)",
          color: "#fff",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="font-heading text-xl font-semibold">{tenant.name}</p>
              {config.address && (
                <p className="text-sm opacity-60 mt-2">{config.address}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 text-sm opacity-60">
              {config.phone && (
                <a href={`tel:${config.phone}`} className="hover:opacity-100 transition-opacity">
                  {config.phone}
                </a>
              )}
              {config.email && (
                <a href={`mailto:${config.email}`} className="hover:opacity-100 transition-opacity">
                  {config.email}
                </a>
              )}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 text-center space-y-1">
            {config.footerTagline && (
              <p className="text-xs opacity-60 italic">{config.footerTagline}</p>
            )}
            <p className="text-xs opacity-40">
              &copy; {new Date().getFullYear()} {tenant.name} · Propulsé par{" "}
              <a
                href="https://directloc.app"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-100"
              >
                DirectLoc
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
