import Link from "next/link";
import { requireTenant } from "@/lib/tenant-context";
import type { TenantConfig } from "@/lib/tenant-context";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await requireTenant();
  const config = (tenant.config ?? {}) as TenantConfig;

  const primaryColor = config.primaryColor ?? "#1a1a1a";
  const secondaryColor = config.secondaryColor ?? "#ffffff";

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
        className="px-6 py-4 shadow-sm"
        style={{ backgroundColor: "var(--color-primary)", color: "var(--color-secondary)" }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity">
            {config.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={config.logoUrl} alt={tenant.name} className="h-10 object-contain" />
            ) : (
              tenant.name
            )}
          </Link>
          <nav className="flex gap-6 text-sm font-medium">
            <Link href="/chambres" className="hover:opacity-80 transition-opacity">
              Chambres
            </Link>
            <Link
              href="/chambres"
              className="px-4 py-2 rounded-full text-sm font-semibold transition-colors"
              style={{
                backgroundColor: "var(--color-secondary)",
                color: "var(--color-primary)",
              }}
            >
              Réserver
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 px-6 py-8 mt-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-800">{tenant.name}</p>
              {config.address && (
                <p className="text-sm text-gray-600 mt-1">{config.address}</p>
              )}
            </div>
            <div className="flex flex-col gap-1 text-sm text-gray-600">
              {config.phone && (
                <a href={`tel:${config.phone}`} className="hover:text-gray-900">
                  {config.phone}
                </a>
              )}
              {config.email && (
                <a href={`mailto:${config.email}`} className="hover:text-gray-900">
                  {config.email}
                </a>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-6 text-center">
            &copy; {new Date().getFullYear()} {tenant.name}
          </p>
        </div>
      </footer>
    </div>
  );
}
