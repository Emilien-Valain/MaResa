import Link from "next/link";
import type { Tenant, TenantConfig } from "@/lib/tenant-context";

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
        } as React.CSSProperties
      }
      className="min-h-screen flex flex-col"
    >
      {/* Header */}
      <header
        className="px-6 py-5"
        style={{ backgroundColor: "var(--color-primary)", color: "var(--color-secondary)" }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            {config.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logoUrl} alt={tenant.name} className="h-10 object-contain" />
            ) : (
              <span className="font-heading text-2xl font-semibold tracking-tight">
                {tenant.name}
              </span>
            )}
          </Link>
          <nav className="flex items-center gap-8 text-sm">
            <Link
              href="/chambres"
              className="opacity-80 hover:opacity-100 transition-opacity tracking-wide"
            >
              Chambres
            </Link>
            <Link
              href="/chambres"
              className="px-5 py-2 rounded-sm text-sm font-medium transition-all hover:brightness-90"
              style={{
                backgroundColor: "var(--color-secondary)",
                color: "var(--color-primary)",
              }}
            >
              Reserver
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer
        className="px-6 py-10 mt-auto border-t"
        style={{
          backgroundColor: "var(--color-primary)",
          color: "var(--color-secondary)",
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
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs opacity-40">
              &copy; {new Date().getFullYear()} {tenant.name}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
