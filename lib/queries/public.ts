import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms } from "@/db/schema";

/**
 * Retourne toutes les chambres actives d'un tenant, triées par date de création.
 */
export async function getRoomsPublic(tenantId: string) {
  return db
    .select()
    .from(rooms)
    .where(and(eq(rooms.tenantId, tenantId), eq(rooms.active, true)))
    .orderBy(asc(rooms.createdAt));
}

/**
 * Retourne une chambre active par son slug et son tenant.
 */
export async function getRoomBySlugPublic(tenantId: string, slug: string) {
  const [room] = await db
    .select()
    .from(rooms)
    .where(
      and(
        eq(rooms.tenantId, tenantId),
        eq(rooms.slug, slug),
        eq(rooms.active, true),
      ),
    )
    .limit(1);

  return room ?? null;
}

/**
 * Retourne une chambre active par son id et son tenant.
 */
export async function getRoomByIdPublic(tenantId: string, id: string) {
  const [room] = await db
    .select()
    .from(rooms)
    .where(
      and(
        eq(rooms.tenantId, tenantId),
        eq(rooms.id, id),
        eq(rooms.active, true),
      ),
    )
    .limit(1);

  return room ?? null;
}
