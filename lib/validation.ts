import { z } from "zod";
import { parisToday } from "@/lib/date-windows";

// ── Primitives réutilisables ──────────────────────────────────────────────────

/** « 05/01/2027 » → « 2027-01-05 » ; toute autre chaîne est rendue telle quelle. */
export function frDateToIso(v: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim());
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : v;
}

// Les champs date de l'admin affichent JJ/MM/AAAA ; l'API et les tests envoient YYYY-MM-DD. Les deux sont acceptés.
const dateString = z.preprocess(
  (v) => (typeof v === "string" ? frDateToIso(v) : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date attendu : JJ/MM/AAAA")
    .refine((s) => {
      // Rejette aussi les dates qui « débordent » (31/02 → 3 mars)
      const d = new Date(s + "T00:00:00.000Z");
      return !isNaN(d.getTime()) && d.toISOString().startsWith(s);
    }, "Date invalide"),
);

/** Borne de séjour : au-delà, c'est une faute de frappe ou un abus (une requête = une boucle par nuit). */
export const MAX_STAY_NIGHTS = 366;
export const STAY_TOO_LONG_MESSAGE = `Séjour trop long (${MAX_STAY_NIGHTS} nuits maximum)`;

export function isStayTooLong(checkIn: Date, checkOut: Date): boolean {
  return checkOut.getTime() - checkIn.getTime() > MAX_STAY_NIGHTS * 86_400_000;
}

const stayNotTooLong = (d: { checkIn: string; checkOut: string }) =>
  !isStayTooLong(new Date(d.checkIn + "T00:00:00Z"), new Date(d.checkOut + "T00:00:00Z"));

const uuidString = z.string().uuid("UUID invalide");
// Un roomId invalide vient d'un select laissé vide : on le dit dans les mots de l'hôte.
const roomIdString = z.string().uuid("Choisissez une chambre");

export function isUuid(s: string): boolean {
  return uuidString.safeParse(s).success;
}

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

const BLOCKED_HOSTS = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[::1?\])/i;

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
    roomId: roomIdString,
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
  )
  .refine(stayNotTooLong, { message: STAY_TOO_LONG_MESSAGE, path: ["checkOut"] })
  // Public seulement : l'hôte peut saisir un séjour passé (régularisation), pas un client.
  .refine((d) => d.checkIn >= parisToday(), {
    message: "La date d'arrivée est déjà passée",
    path: ["checkIn"],
  });

export const bookingManualSchema = z
  .object({
    roomId: roomIdString,
    guestName: safeName,
    guestEmail: email,
    guestPhone: phone,
    guestCount: positiveInt,
    checkIn: dateString,
    checkOut: dateString,
    notes: safeText.optional().or(z.literal("")),
    // Total convenu avec le client ; vide = prix calculé par les règles tarifaires.
    agreedPrice: z
      .string()
      .trim()
      .regex(/^\d+([.,]\d{1,2})?$/, "Prix convenu : un montant en euros (ex : 250 ou 249,50)")
      .optional()
      .or(z.literal("")),
    // Case « Forcer » : autorise l'admission par-dessus un Hold (override admin).
    // Checkbox absente si décochée → false ; "on" si cochée → true.
    force: z
      .string()
      .optional()
      .transform((v) => v === "on"),
  })
  .refine(
    (d) => new Date(d.checkOut + "T00:00:00Z") > new Date(d.checkIn + "T00:00:00Z"),
    { message: "La date de départ doit être après la date d'arrivée", path: ["checkOut"] },
  )
  .refine(stayNotTooLong, { message: STAY_TOO_LONG_MESSAGE, path: ["checkOut"] });

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
  roomId: roomIdString,
  name: safeName,
  url: icalUrl,
});

// ── Règles de réservation ────────────────────────────────────────────────────

export const manualBlockSchema = z
  .object({
    roomId: roomIdString.optional().or(z.literal("")),
    startDate: dateString,
    endDate: dateString,
    recurring: z.enum(["on"]).optional(),
    recurrenceType: z.enum(["weekly"]).optional(),
    recurrenceDays: z.string().optional().or(z.literal("")), // "0,1,6"
    recurrenceUntil: dateString.optional().or(z.literal("")),
  })
  .refine(
    (d) => {
      if (d.recurring === "on") return true; // pas de contrainte date pour récurrent
      return new Date(d.endDate + "T00:00:00Z") >= new Date(d.startDate + "T00:00:00Z");
    },
    { message: "La date de fin doit être après la date de début", path: ["endDate"] },
  );

export const bookingRuleSchema = z.object({
  roomId: roomIdString.optional().or(z.literal("")),
  validFrom: dateString.optional().or(z.literal("")),
  validTo: dateString.optional().or(z.literal("")),
  minStay: z.coerce.number().int("Nombre de nuits entier").min(1, "Au moins 1 nuit").optional().or(z.literal("").transform(() => undefined)),
  maxStay: z.coerce.number().int("Nombre de nuits entier").min(1, "Au moins 1 nuit").optional().or(z.literal("").transform(() => undefined)),
  allowedCheckInDays: z.string().optional().or(z.literal("")), // "6" ou "0,6"
  allowedCheckOutDays: z.string().optional().or(z.literal("")),
});

export const pricingRuleSchema = z
  .object({
    roomId: roomIdString.optional().or(z.literal("")),
    name: safeName,
    validFrom: dateString.optional().or(z.literal("")),
    validTo: dateString.optional().or(z.literal("")),
    daysOfWeek: z.string().optional().or(z.literal("")), // "5,6"
    fixedPrice: positiveDecimal.optional().or(z.literal("")),
    percentageModifier: z
      .string()
      .regex(/^-?\d+([.,]\d{1,2})?$/, "Format invalide (ex: 30 ou -15.50)")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (d) => {
      const hasFP = d.fixedPrice && d.fixedPrice !== "";
      const hasPM = d.percentageModifier && d.percentageModifier !== "";
      return hasFP || hasPM;
    },
    { message: "Indiquez un prix fixe ou un modificateur en pourcentage", path: ["fixedPrice"] },
  );

export const locationSchema = z.object({
  googleMapsUrl: z
    .string()
    .max(2000, "URL trop longue")
    .refine(
      (url) => {
        if (!url) return true;
        try {
          const parsed = new URL(url);
          return (
            parsed.hostname.includes("google") ||
            parsed.hostname.includes("goo.gl") ||
            parsed.hostname.includes("maps.app")
          );
        } catch {
          return false;
        }
      },
      "L'URL doit être un lien Google Maps",
    )
    .optional()
    .or(z.literal("")),
  latitude: z
    .string()
    .refine(
      (s) => {
        if (!s) return true;
        const n = parseFloat(s);
        return !isNaN(n) && n >= -90 && n <= 90;
      },
      "Latitude invalide (entre -90 et 90)",
    )
    .optional()
    .or(z.literal("")),
  longitude: z
    .string()
    .refine(
      (s) => {
        if (!s) return true;
        const n = parseFloat(s);
        return !isNaN(n) && n >= -180 && n <= 180;
      },
      "Longitude invalide (entre -180 et 180)",
    )
    .optional()
    .or(z.literal("")),
});

// ── Helper : parse un FormData avec un schéma Zod ────────────────────────────

function formEntries(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    raw[key] = typeof value === "string" ? value : undefined;
  }
  return raw;
}

export function parseFormData<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
): z.infer<T> {
  return schema.parse(formEntries(formData));
}

// ── Résultat des server actions de formulaire ────────────────────────────────
// Une erreur levée par une server action est masquée en production (digest) :
// les erreurs de saisie sont donc RENDUES au client, jamais levées.

/** `undefined` = succès ; sinon un message FR prêt à afficher et, par champ, son erreur. */
export type FormResult = { error: string; fieldErrors: Record<string, string> } | undefined;

export function formError(e: z.ZodError): NonNullable<FormResult> {
  const fieldErrors: Record<string, string> = {};
  for (const i of e.issues) {
    const name = String(i.path[0] ?? "");
    if (name && !fieldErrors[name]) fieldErrors[name] = i.message;
  }
  return { error: e.issues.map((i) => i.message).join(" · "), fieldErrors };
}

/** Comme parseFormData, mais rend l'erreur de saisie au lieu de la lever. */
export function safeParseFormData<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
): { data: z.infer<T> } | NonNullable<FormResult> {
  const r = schema.safeParse(formEntries(formData));
  return r.success ? { data: r.data } : formError(r.error);
}
