import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants, rooms } from "@/db/schema";

type Photo = { id: string; filename: string; url: string; position: number };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");

  if (!tenantId) return [];

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant) return [];

  const host = headersList.get("host") ?? tenant.domain;
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;

  const activeRooms = await db.query.rooms.findMany({
    where: and(eq(rooms.tenantId, tenantId), eq(rooms.active, true)),
    orderBy: (rooms, { asc }) => [asc(rooms.createdAt)],
  });

  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/chambres`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  for (const room of activeRooms) {
    const photos = (room.photos as Photo[]) ?? [];
    const images = photos
      .sort((a, b) => a.position - b.position)
      .map((p) => `${baseUrl}${p.url}`);

    entries.push({
      url: `${baseUrl}/chambres/${room.slug}`,
      changeFrequency: "weekly",
      priority: 0.6,
      ...(images.length > 0 ? { images } : {}),
    });
  }

  return entries;
}
