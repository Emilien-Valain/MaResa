import path from "path";
import fs from "fs/promises";

/**
 * Dossier racine des uploads.
 * En production (Docker/Coolify), monter un volume persistent sur ce chemin.
 * Ex: volumes: ["./uploads:/app/uploads"]
 */
const UPLOADS_ROOT =
  process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");

/** Sous-dossier pour les photos d'une chambre */
export function roomPhotosDir(tenantId: string, roomId: string) {
  return path.join(UPLOADS_ROOT, "rooms", tenantId, roomId);
}

/** Chemin complet d'un fichier photo */
export function photoFilePath(
  tenantId: string,
  roomId: string,
  filename: string,
) {
  return path.join(roomPhotosDir(tenantId, roomId), filename);
}

/** URL publique pour accéder à une photo */
export function photoPublicUrl(
  tenantId: string,
  roomId: string,
  filename: string,
) {
  return `/api/uploads/rooms/${tenantId}/${roomId}/${filename}`;
}

/** S'assure que le dossier existe */
export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/** Sous-dossier pour les photos d'un tenant (hero, story…) */
export function tenantPhotosDir(tenantId: string) {
  return path.join(UPLOADS_ROOT, "tenants", tenantId);
}

export function tenantPhotoFilePath(tenantId: string, filename: string) {
  return path.join(tenantPhotosDir(tenantId), filename);
}

export function tenantPhotoPublicUrl(tenantId: string, filename: string) {
  return `/api/uploads/tenants/${tenantId}/${filename}`;
}
