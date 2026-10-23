"use server";

import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { rooms, properties, tenants } from "@/db/schema";
import { roomSchema, roomUpdateSchema, safeParseFormData, type FormResult } from "@/lib/validation";

async function requireTenantId(): Promise<string> {
  const { tenantId } = await requireSession();
  return tenantId;
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Slug unique par tenant : si vide (nom sans lettres latines) ou déjà pris par une autre chambre,
// on suffixe avec les 6 premiers caractères de l'id de la chambre.
async function uniqueRoomSlug(tenantId: string, roomId: string, name: string): Promise<string> {
  const base = slugify(name);
  if (base) {
    const taken = await db.query.rooms.findFirst({
      where: and(eq(rooms.tenantId, tenantId), eq(rooms.slug, base), ne(rooms.id, roomId)),
      columns: { id: true },
    });
    if (!taken) return base;
  }
  return `${base || "chambre"}-${roomId.slice(0, 6)}`;
}

export async function createRoom(formData: FormData): Promise<FormResult> {
  const tenantId = await requireTenantId();

  const parsed = safeParseFormData(roomSchema, formData);
  if ("error" in parsed) return parsed;
  const { data } = parsed;
  const name = data.nom;
  const description = data.description || null;
  const pricePerNight = data.prix.replace(",", ".");
  const capacity = data.capacite;

  // 1 tenant = 1 property dans ce modèle — on auto-crée si absente
  let property = await db.query.properties.findFirst({
    where: eq(properties.tenantId, tenantId),
  });

  if (!property) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { name: true },
    });
    [property] = await db
      .insert(properties)
      .values({ tenantId, name: tenant?.name ?? "Propriété" })
      .returning();
  }

  const id = crypto.randomUUID();
  await db.insert(rooms).values({
    id,
    tenantId,
    propertyId: property.id,
    name,
    slug: await uniqueRoomSlug(tenantId, id, name),
    description,
    pricePerNight,
    capacity,
  });

  revalidatePath("/admin/chambres");
  redirect("/admin/chambres");
}

export async function updateRoom(id: string, formData: FormData): Promise<FormResult> {
  const tenantId = await requireTenantId();

  const parsed = safeParseFormData(roomUpdateSchema, formData);
  if ("error" in parsed) return parsed;
  const { data } = parsed;
  const name = data.nom;
  const description = data.description || null;
  const pricePerNight = data.prix.replace(",", ".");
  const capacity = data.capacite;
  const active = data.actif === "on";

  await db
    .update(rooms)
    .set({ name, slug: await uniqueRoomSlug(tenantId, id, name), description, pricePerNight, capacity, active })
    .where(and(eq(rooms.id, id), eq(rooms.tenantId, tenantId)));

  revalidatePath("/admin/chambres");
  redirect("/admin/chambres");
}

export async function deleteRoom(id: string): Promise<{ error?: string }> {
  const tenantId = await requireTenantId();

  try {
    await db
      .delete(rooms)
      .where(and(eq(rooms.id, id), eq(rooms.tenantId, tenantId)));
  } catch (e) {
    // 23503 = clé étrangère : la chambre a encore des réservations, blocages ou calendriers liés.
    const code = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;
    if (code === "23503") {
      return {
        error:
          "Cette chambre a des réservations ou des calendriers liés : elle ne peut pas être supprimée. Désactivez-la plutôt depuis « Modifier ».",
      };
    }
    throw e;
  }

  revalidatePath("/admin/chambres");
  return {};
}
