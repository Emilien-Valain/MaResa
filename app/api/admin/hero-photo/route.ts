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
import type { TenantConfig, HeroPhoto } from "@/lib/tenant-context";

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

export async function POST(request: NextRequest) {
  const { tenantId } = await requireSession();

  const formData = await request.formData();
  const file = formData.get("photo") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Type non supporté : ${file.type}` },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo)` },
      { status: 400 },
    );
  }

  const config = await readConfig(tenantId);

  await ensureDir(tenantPhotosDir(tenantId));

  const id = randomUUID();
  const ext = file.type === "image/png" ? "png" : "webp";
  const filename = `hero-${id}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const optimized = await sharp(buffer)
    .resize({ width: 2400, height: 1600, fit: "inside", withoutEnlargement: true })
    .toFormat(ext === "png" ? "png" : "webp", { quality: 80 })
    .toBuffer();

  await fs.writeFile(tenantPhotoFilePath(tenantId, filename), optimized);

  // Supprime l'ancien fichier si présent
  const previous = config.heroPhoto;
  if (previous?.filename) {
    try {
      await fs.unlink(tenantPhotoFilePath(tenantId, previous.filename));
    } catch {
      // déjà absent
    }
  }

  const hero: HeroPhoto = {
    id,
    filename,
    url: tenantPhotoPublicUrl(tenantId, filename),
  };

  await writeConfig(tenantId, { ...config, heroPhoto: hero });

  return NextResponse.json({ heroPhoto: hero });
}

export async function DELETE() {
  const { tenantId } = await requireSession();

  const config = await readConfig(tenantId);
  const previous = config.heroPhoto;

  if (previous?.filename) {
    try {
      await fs.unlink(tenantPhotoFilePath(tenantId, previous.filename));
    } catch {
      // déjà absent
    }
  }

  await writeConfig(tenantId, { ...config, heroPhoto: null });

  return NextResponse.json({ heroPhoto: null });
}
