import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms } from "@/db/schema";

export async function getRoomsByTenant(tenantId: string) {
  return db.query.rooms.findMany({
    where: eq(rooms.tenantId, tenantId),
    orderBy: (rooms, { asc }) => [asc(rooms.createdAt)],
  });
}

export async function getRoomByIdAndTenant(id: string, tenantId: string) {
  return db.query.rooms.findFirst({
    where: and(eq(rooms.id, id), eq(rooms.tenantId, tenantId)),
  });
}
