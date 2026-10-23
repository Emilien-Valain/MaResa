"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { icalBlocks, icalSources, rooms } from "@/db/schema";
import { icalSourceSchema, safeParseFormData, type FormResult } from "@/lib/validation";

export async function addIcalSource(formData: FormData): Promise<FormResult> {
  const { tenantId } = await requireSession();

  const parsed = safeParseFormData(icalSourceSchema, formData);
  if ("error" in parsed) return parsed;
  const { roomId, name, url } = parsed.data;

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

  // Les blocs importés référencent la source (FK sans cascade) : on les retire avec elle.
  await db.transaction(async (tx) => {
    await tx
      .delete(icalBlocks)
      .where(and(eq(icalBlocks.sourceId, sourceId), eq(icalBlocks.tenantId, tenantId)));
    await tx
      .delete(icalSources)
      .where(and(eq(icalSources.id, sourceId), eq(icalSources.tenantId, tenantId)));
  });

  revalidatePath("/admin/parametres");
  revalidatePath("/admin/calendrier");
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

