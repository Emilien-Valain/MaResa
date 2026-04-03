import { z } from "zod";

// ── Primitives réutilisables ──────────────────────────────────────────────────

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date attendu : YYYY-MM-DD")
  .refine((s) => !isNaN(new Date(s + "T00:00:00.000Z").getTime()), "Date invalide");

const uuidString = z.string().uuid("UUID invalide");

const email = z.string().email("Adresse email invalide").max(320);

const phone = z
  .string()
  .max(30, "Numéro trop long")
  .regex(/^[+\d\s()./-]*$/, "Numéro de téléphone invalide")
  .optional()
  .or(z.literal(""));

const safeName = z
  .string()
  .min(1, "Champ obligatoire")
  .max(200, "Trop long (200 caractères max)");

const safeText = z.string().max(5000, "Texte trop long (5000 caractères max)");

const positiveInt = z.coerce
  .number()
  .int("Doit être un entier")
  .positive("Doit être supérieur à 0");

const positiveDecimal = z
  .string()
  .regex(/^\d+([.,]\d{1,2})?$/, "Format de prix invalide (ex: 85 ou 85.50)")
  .refine((s) => parseFloat(s.replace(",", ".")) > 0, "Le prix doit être supérieur à 0");

// ── URL iCal (anti-SSRF) ─────────────────────────────────────────────────────

const BLOCKED_HOSTS = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|0\.0\.0\.0|\[::1?\])/i;

const icalUrl = z
  .string()
  .url("URL invalide")
  .max(2000, "URL trop longue")
  .refine((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }, "Seuls les protocoles HTTP et HTTPS sont autorisés")
  .refine((url) => {
    try {
      const parsed = new URL(url);
      return !BLOCKED_HOSTS.test(parsed.hostname);
    } catch {
      return false;
    }
  }, "URL vers un réseau interne non autorisée");

// ── Schémas par action ────────────────────────────────────────────────────────

export const bookingPublicSchema = z
  .object({
    roomId: uuidString,
    checkIn: dateString,
    checkOut: dateString,
    guestName: safeName,
    guestEmail: email,
    guestPhone: phone,
    guestCount: positiveInt,
  })
  .refine(
    (d) => new Date(d.checkOut + "T00:00:00Z") > new Date(d.checkIn + "T00:00:00Z"),
    { message: "La date de départ doit être après la date d'arrivée", path: ["checkOut"] },
  );

export const bookingManualSchema = z
  .object({
    roomId: uuidString,
    guestName: safeName,
    guestEmail: email,
    guestPhone: phone,
    guestCount: positiveInt,
    checkIn: dateString,
    checkOut: dateString,
    notes: safeText.optional().or(z.literal("")),
  })
  .refine(
    (d) => new Date(d.checkOut + "T00:00:00Z") > new Date(d.checkIn + "T00:00:00Z"),
    { message: "La date de départ doit être après la date d'arrivée", path: ["checkOut"] },
  );

export const roomSchema = z.object({
  nom: safeName,
  description: safeText.optional().or(z.literal("")),
  prix: positiveDecimal,
  capacite: positiveInt.refine((n) => n <= 50, "Capacité max : 50 personnes"),
});

export const roomUpdateSchema = roomSchema.extend({
  actif: z.enum(["on"]).optional(),
});

export const icalSourceSchema = z.object({
  roomId: uuidString,
  name: safeName,
  url: icalUrl,
});

// ── Helper : parse un FormData avec un schéma Zod ────────────────────────────

export function parseFormData<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
): z.infer<T> {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    raw[key] = typeof value === "string" ? value : undefined;
  }
  return schema.parse(raw);
}
