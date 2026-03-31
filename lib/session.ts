import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";

/**
 * Récupère la session et le tenantId depuis la DB.
 * Redirige vers /login si pas de session ou pas de tenant associé.
 */
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { tenantId: true },
  });

  if (!user?.tenantId) redirect("/login");

  return { session, tenantId: user.tenantId };
}
