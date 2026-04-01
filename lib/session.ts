import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userTenants } from "@/db/schema";

/**
 * Récupère la session et le tenantId courant depuis le header x-tenant-id (injecté par le proxy).
 * Vérifie que l'utilisateur a accès au tenant via la table user_tenants.
 * Redirige vers /login si pas de session, pas de tenant, ou pas d'accès.
 */
export async function requireSession() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) redirect("/login");

  const tenantId = headersList.get("x-tenant-id");
  if (!tenantId) redirect("/login");

  const membership = await db.query.userTenants.findFirst({
    where: and(
      eq(userTenants.userId, session.user.id),
      eq(userTenants.tenantId, tenantId),
    ),
  });

  if (!membership) redirect("/login");

  return { session, tenantId };
}
