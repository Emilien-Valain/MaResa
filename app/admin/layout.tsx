import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userTenants, tenants } from "@/db/schema";
import Sidebar from "@/components/admin/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    redirect("/login");
  }

  const tenantId = headersList.get("x-tenant-id");

  const memberships = await db.query.userTenants.findMany({
    where: eq(userTenants.userId, session.user.id),
    with: { tenant: true },
  });

  const currentTenant = memberships.find((m) => m.tenantId === tenantId)?.tenant;
  const isDev = process.env.NODE_ENV === "development";
  const port = isDev ? `:${process.env.PORT ?? "3000"}` : "";

  const accessibleTenants = memberships.map((m) => ({
    id: m.tenant.id,
    name: m.tenant.name,
    slug: m.tenant.slug,
    isCurrent: m.tenantId === tenantId,
    adminUrl: isDev
      ? `http://${m.tenant.slug}.localhost${port}/admin`
      : m.tenant.domain
        ? `https://${m.tenant.domain}/admin`
        : null,
  }));

  return (
    <div data-admin className="flex flex-col lg:flex-row h-dvh overflow-hidden">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2.5 focus:rounded-lg focus:text-[13.5px] focus:font-semibold"
        style={{ background: "var(--admin-primary)", color: "#fff" }}
      >
        Aller au contenu
      </a>
      <Sidebar
        userEmail={session.user.email}
        userName={session.user.name ?? undefined}
        currentTenantName={currentTenant?.name ?? ""}
        initialCollapsed={(await cookies()).get("admin-sidebar-collapsed")?.value === "1"}
        accessibleTenants={accessibleTenants}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <main id="admin-main" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
          <div className="px-5 sm:px-8 py-7 max-w-[1280px] mx-auto w-full admin-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
