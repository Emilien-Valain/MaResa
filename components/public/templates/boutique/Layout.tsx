import Link from "next/link";
import type { Tenant, TenantConfig } from "@/lib/tenant-context";

/**
 * Template "Boutique" — style élégant et minimaliste.
 * Header fond clair avec logo centré, navigation discrète, footer épuré.
 * La couleur primaire est utilisée comme accent (liens, bordures) plutôt qu'en fond plein.
 */
export default function BoutiqueLayout({
  tenant,
  config,
  children,
}: {
  tenant: Tenant;
  config: TenantConfig;
  children: React.ReactNode;
}) {
  const primaryColor = config.primaryColor ?? "#2d3748";
  const secondaryColor = config.secondaryColor ?? "#f7f3ef";

  return (
    <div
      style={
        {
          "--color-primary": primaryColor,
          "--color-secondary": secondaryColor,
        } as React.CSSProperties
      }
      className="min-h-screen flex flex-col"
    >
      {/* Header — fond secondaire, logo centré */}
      <header
        className="px-6 py-8 border-b"
        style={{
          backgroundColor: "var(--color-secondary)",
          borderColor: "color-mix(in oklch, var(--color-primary) 15%, transparent)",
        }}
      >
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-5">
          <Link href="/" className="hover:opacity-70 transition-opacity text-center">
            {config.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.logoUrl}
                alt={tenant.name}
                className="h-14 object-contain mx-auto"
              />
            ) : (
              <span
                className="font-heading text-3xl font-semibold tracking-widest uppercase"
                style={{ color: "var(--color-primary)" }}
              >
                {tenant.name}
              </span>
            )}
          </Link>
          <nav className="flex gap-8 text-xs font-medium tracking-widest uppercase">
            <Link
              href="/chambres"
              className="hover:opacity-60 transition-opacity"
              style={{ color: "var(--color-primary)" }}
            >
              Chambres
            </Link>
            <span
              style={{ color: "var(--color-primary)", opacity: 0.2 }}
              aria-hidden
            >
              ·
            </span>
            <Link
              href="/chambres"
              className="hover:opacity-60 transition-opacity"
              style={{ color: "var(--color-primary)" }}
            >
              Réserver
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer — minimal, centré */}
      <footer
        className="px-6 py-12 mt-auto border-t text-center"
        style={{
          backgroundColor: "var(--color-secondary)",
          borderColor: "color-mix(in oklch, var(--color-primary) 15%, transparent)",
        }}
      >
        <p
          className="font-heading text-lg tracking-widest uppercase mb-3"
          style={{ color: "var(--color-primary)" }}
        >
          {tenant.name}
        </p>
        {config.address && (
          <p className="text-xs opacity-50 mb-1" style={{ color: "var(--color-primary)" }}>
            {config.address}
          </p>
        )}
        <div className="flex justify-center gap-4 text-xs mt-3">
          {config.phone && (
            <a
              href={`tel:${config.phone}`}
              className="opacity-50 hover:opacity-80 transition-opacity"
              style={{ color: "var(--color-primary)" }}
            >
              {config.phone}
            </a>
          )}
          {config.email && (
            <a
              href={`mailto:${config.email}`}
              className="opacity-50 hover:opacity-80 transition-opacity"
              style={{ color: "var(--color-primary)" }}
            >
              {config.email}
            </a>
          )}
        </div>
        <p className="text-xs opacity-30 mt-8" style={{ color: "var(--color-primary)" }}>
          &copy; {new Date().getFullYear()} {tenant.name}
        </p>
      </footer>
    </div>
  );
}
