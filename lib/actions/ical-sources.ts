"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { icalSources, rooms } from "@/db/schema";

export async function addIcalSource(formData: FormData) {
  const { tenantId } = await requireSession();

  const roomId = formData.get("roomId") as string;
  const name = formData.get("name") as string;
  const url = formData.get("url") as string;

  if (!roomId || !name || !url) {
    throw new Error("Champs obligatoires manquants");
  }

  // Vérifier que la chambre appartient au tenant
  const [room] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(and(eq(rooms.id, roomId), eq(rooms.tenantId, tenantId)))
    .limit(1);

  if (!room) {
    throw new Error("Chambre introuvable");
  }

  await db.insert(icalSources).values({
    tenantId,
    roomId,
    name,
    url,
  });

  revalidatePath("/admin/parametres");
}

export async function deleteIcalSource(formData: FormData) {
  const { tenantId } = await requireSession();

  const sourceId = formData.get("sourceId") as string;

  if (!sourceId) {
    throw new Error("ID de source manquant");
  }

  await db
    .delete(icalSources)
    .where(and(eq(icalSources.id, sourceId), eq(icalSources.tenantId, tenantId)));

  revalidatePath("/admin/parametres");
}

export async function toggleIcalSource(formData: FormData) {
  const { tenantId } = await requireSession();

  const sourceId = formData.get("sourceId") as string;
  const active = formData.get("active") === "true";

  if (!sourceId) {
    throw new Error("ID de source manquant");
  }

  await db
    .update(icalSources)
    .set({ active })
    .where(and(eq(icalSources.id, sourceId), eq(icalSources.tenantId, tenantId)));

  revalidatePath("/admin/parametres");
}
