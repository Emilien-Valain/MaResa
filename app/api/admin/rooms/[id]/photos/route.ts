import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import sharp from "sharp";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { rooms } from "@/db/schema";
import {
  roomPhotosDir,
  photoFilePath,
  photoPublicUrl,
  ensureDir,
} from "@/lib/uploads";

export type RoomPhoto = {
  id: string;
  filename: string;
  url: string;
  position: number;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_PHOTOS = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ─── POST : upload une ou plusieurs photos ─────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: roomId } = await params;
  const { tenantId } = await requireSession();

  // Vérifier que la chambre appartient au tenant
  const room = await db.query.rooms.findFirst({
    where: and(eq(rooms.id, roomId), eq(rooms.tenantId, tenantId)),
    columns: { id: true, photos: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Chambre introuvable" }, { status: 404 });
  }

  const currentPhotos = (room.photos ?? []) as RoomPhoto[];

  const formData = await request.formData();
  const files = formData.getAll("photos") as File[];

  if (files.length === 0) {
    return NextResponse.json(
      { error: "Aucun fichier envoyé" },
      { status: 400 },
    );
  }

  if (currentPhotos.length + files.length > MAX_PHOTOS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_PHOTOS} photos par chambre` },
      { status: 400 },
    );
  }

  const dir = roomPhotosDir(tenantId, roomId);
  await ensureDir(dir);

  const newPhotos: RoomPhoto[] = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Type non supporté : ${file.type}. Acceptés : JPEG, PNG, WebP` },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo)` },
        { status: 400 },
      );
    }

    const id = randomUUID();
    const ext = file.type === "image/png" ? "png" : "webp";
    const filename = `${id}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Optimiser : redimensionner à max 1600px de large, convertir en WebP/PNG
    const optimized = await sharp(buffer)
      .resize({ width: 1600, height: 1200, fit: "inside", withoutEnlargement: true })
      .toFormat(ext === "png" ? "png" : "webp", { quality: 82 })
      .toBuffer();

    await fs.writeFile(photoFilePath(tenantId, roomId, filename), optimized);

    newPhotos.push({
      id,
      filename,
      url: photoPublicUrl(tenantId, roomId, filename),
      position: currentPhotos.length + newPhotos.length,
    });
  }

  const updatedPhotos = [...currentPhotos, ...newPhotos];

  await db
    .update(rooms)
    .set({ photos: updatedPhotos })
    .where(and(eq(rooms.id, roomId), eq(rooms.tenantId, tenantId)));

  return NextResponse.json({ photos: updatedPhotos });
}

// ─── DELETE : supprimer une photo par son id ────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: roomId } = await params;
  const { tenantId } = await requireSession();

  const { photoId } = (await request.json()) as { photoId: string };

  const room = await db.query.rooms.findFirst({
    where: and(eq(rooms.id, roomId), eq(rooms.tenantId, tenantId)),
    columns: { id: true, photos: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Chambre introuvable" }, { status: 404 });
  }

  const currentPhotos = (room.photos ?? []) as RoomPhoto[];
  const photo = currentPhotos.find((p) => p.id === photoId);

  if (!photo) {
    return NextResponse.json({ error: "Photo introuvable" }, { status: 404 });
  }

  // Supprimer le fichier du disque
  try {
    await fs.unlink(photoFilePath(tenantId, roomId, photo.filename));
  } catch {
    // Fichier déjà absent — on continue
  }

  const updatedPhotos = currentPhotos
    .filter((p) => p.id !== photoId)
    .map((p, i) => ({ ...p, position: i }));

  await db
    .update(rooms)
    .set({ photos: updatedPhotos })
    .where(and(eq(rooms.id, roomId), eq(rooms.tenantId, tenantId)));

  return NextResponse.json({ photos: updatedPhotos });
}

// ─── PUT : réordonner les photos ────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: roomId } = await params;
  const { tenantId } = await requireSession();

  const { photoIds } = (await request.json()) as { photoIds: string[] };

  const room = await db.query.rooms.findFirst({
    where: and(eq(rooms.id, roomId), eq(rooms.tenantId, tenantId)),
    columns: { id: true, photos: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Chambre introuvable" }, { status: 404 });
  }

  const currentPhotos = (room.photos ?? []) as RoomPhoto[];
  const photoMap = new Map(currentPhotos.map((p) => [p.id, p]));

  const reordered: RoomPhoto[] = photoIds
    .map((id, i) => {
      const p = photoMap.get(id);
      return p ? { ...p, position: i } : null;
    })
    .filter((p): p is RoomPhoto => p !== null);

  await db
    .update(rooms)
    .set({ photos: reordered })
    .where(and(eq(rooms.id, roomId), eq(rooms.tenantId, tenantId)));

  return NextResponse.json({ photos: reordered });
}
