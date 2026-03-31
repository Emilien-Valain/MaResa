"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { rooms, properties, tenants } from "@/db/schema";

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

export async function createRoom(formData: FormData) {
  const tenantId = await requireTenantId();

  const name = formData.get("nom") as string;
  const description = (formData.get("description") as string) || null;
  const pricePerNight = formData.get("prix") as string;
  const capacity = parseInt(formData.get("capacite") as string, 10);

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

  await db.insert(rooms).values({
    tenantId,
    propertyId: property.id,
    name,
    slug: slugify(name),
    description,
    pricePerNight,
    capacity,
  });

  revalidatePath("/admin/chambres");
  redirect("/admin/chambres");
}

export async function updateRoom(id: string, formData: FormData) {
  const tenantId = await requireTenantId();

  const name = formData.get("nom") as string;
  const description = (formData.get("description") as string) || null;
  const pricePerNight = formData.get("prix") as string;
  const capacity = parseInt(formData.get("capacite") as string, 10);
  const active = formData.get("actif") === "on";

  await db
    .update(rooms)
    .set({ name, slug: slugify(name), description, pricePerNight, capacity, active })
    .where(and(eq(rooms.id, id), eq(rooms.tenantId, tenantId)));

  revalidatePath("/admin/chambres");
  redirect("/admin/chambres");
}

export async function deleteRoom(id: string) {
  const tenantId = await requireTenantId();

  await db
    .delete(rooms)
    .where(and(eq(rooms.id, id), eq(rooms.tenantId, tenantId)));

  revalidatePath("/admin/chambres");
}
