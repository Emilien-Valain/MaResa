import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { tenants } from "@/db/schema";
import {
  tenantPhotosDir,
  tenantPhotoFilePath,
  tenantPhotoPublicUrl,
  ensureDir,
} from "@/lib/uploads";
import type {
  TenantConfig,
  GalleryPhoto,
} from "@/lib/tenant-context";
import { GALLERY_MAX_PHOTOS, GALLERY_CAPTION_MAX } from "@/lib/gallery";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function readConfig(tenantId: string): Promise<TenantConfig> {
  const [t] = await db
    .select({ config: tenants.config })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!t) throw new Error("Tenant introuvable");
  return (t.config ?? {}) as TenantConfig;
}

async function writeConfig(tenantId: string, config: TenantConfig) {
  await db.update(tenants).set({ config }).where(eq(tenants.id, tenantId));
  revalidatePath("/admin/parametres");
  revalidatePath("/");
}

function sanitizeCaption(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim().slice(0, GALLERY_CAPTION_MAX);
  return trimmed.length > 0 ? trimmed : undefined;
}

// ─── POST : upload une ou plusieurs photos ────────────────────────────────
export async function POST(request: NextRequest) {
  const { tenantId } = await requireSession();

  const formData = await request.formData();
  const files = formData.getAll("photos") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "Aucun fichier envoyé" }, { status: 400 });
  }

  const config = await readConfig(tenantId);
  const current = (config.galleryPhotos ?? []) as GalleryPhoto[];

  if (current.length + files.length > GALLERY_MAX_PHOTOS) {
    return NextResponse.json(
      { error: `Maximum ${GALLERY_MAX_PHOTOS} photos d'illustration` },
      { status: 400 },
    );
  }

  await ensureDir(tenantPhotosDir(tenantId));

  const added: GalleryPhoto[] = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Type non supporté : ${file.type}. Acceptés : JPEG, PNG, WebP`,
        },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo)`,
        },
        { status: 400 },
      );
    }

    const id = randomUUID();
    const ext = file.type === "image/png" ? "png" : "webp";
    const filename = `gallery-${id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const optimized = await sharp(buffer)
      .resize({ width: 1800, height: 1200, fit: "inside", withoutEnlargement: true })
      .toFormat(ext === "png" ? "png" : "webp", { quality: 82 })
      .toBuffer();

    await fs.writeFile(tenantPhotoFilePath(tenantId, filename), optimized);

    added.push({
      id,
      filename,
      url: tenantPhotoPublicUrl(tenantId, filename),
    });
  }

  const next = [...current, ...added];
  await writeConfig(tenantId, { ...config, galleryPhotos: next });

  return NextResponse.json({ galleryPhotos: next });
}

// ─── DELETE : supprimer une photo par id ───────────────────────────────────
export async function DELETE(request: NextRequest) {
  const { tenantId } = await requireSession();

  let photoId: string | undefined;
  try {
    const body = (await request.json()) as { photoId?: string };
    photoId = body.photoId;
  } catch {
    photoId = undefined;
  }
  if (!photoId) {
    return NextResponse.json({ error: "photoId requis" }, { status: 400 });
  }

  const config = await readConfig(tenantId);
  const current = (config.galleryPhotos ?? []) as GalleryPhoto[];
  const photo = current.find((p) => p.id === photoId);

  if (!photo) {
    return NextResponse.json({ error: "Photo introuvable" }, { status: 404 });
  }

  try {
    await fs.unlink(tenantPhotoFilePath(tenantId, photo.filename));
  } catch {
    // déjà absent
  }

  const next = current.filter((p) => p.id !== photoId);
  await writeConfig(tenantId, { ...config, galleryPhotos: next });

  return NextResponse.json({ galleryPhotos: next });
}

// ─── PUT : réordonner + mettre à jour les légendes ─────────────────────────
// Body : { photos: [{ id, caption? }] } — l'ordre du tableau définit la position.
export async function PUT(request: NextRequest) {
  const { tenantId } = await requireSession();

  let body: { photos?: Array<{ id: string; caption?: string }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const items = body.photos;
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "photos[] requis" }, { status: 400 });
  }

  const config = await readConfig(tenantId);
  const current = (config.galleryPhotos ?? []) as GalleryPhoto[];
  const byId = new Map(current.map((p) => [p.id, p]));

  const next: GalleryPhoto[] = [];
  for (const it of items) {
    const existing = byId.get(it.id);
    if (!existing) continue; // ignore IDs inconnus (déjà supprimés)
    next.push({
      ...existing,
      caption: sanitizeCaption(it.caption),
    });
  }

  await writeConfig(tenantId, { ...config, galleryPhotos: next });

  return NextResponse.json({ galleryPhotos: next });
}
