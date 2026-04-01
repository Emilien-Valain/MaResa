import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userTenants, tenants } from "@/db/schema";
import AdminNav from "@/components/admin/AdminNav";

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

  // Charger tous les tenants auxquels l'utilisateur a accès
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
    <div className="min-h-screen flex flex-col bg-warm-50">
      <AdminNav
        userEmail={session.user.email}
        currentTenantName={currentTenant?.name ?? ""}
        accessibleTenants={accessibleTenants}
      />
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  );
}
