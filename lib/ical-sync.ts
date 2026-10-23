import { and, eq, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { icalSources, icalBlocks } from "@/db/schema";
import { lookup } from "node:dns/promises";
import { BlockList } from "node:net";

// Anti-SSRF : plages internes interdites (les formes IPv4-mappées ::ffff:x sont couvertes par BlockList).
const privateRanges = new BlockList();
for (const [net, bits] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.168.0.0", 16],
] as const) privateRanges.addSubnet(net, bits, "ipv4");
for (const [net, bits] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10]] as const)
  privateRanges.addSubnet(net, bits, "ipv6");

export function isPrivateAddress(address: string, family: 4 | 6): boolean {
  return privateRanges.check(address, family === 4 ? "ipv4" : "ipv6");
}

/**
 * Refuse une URL dont l'hôte résout (DNS au moment du fetch) vers le réseau interne :
 * le filtre du schéma ne voit que le texte (169.254.x, noms Docker, *.nip.io…).
 * ICAL_ALLOW_PRIVATE=1 n'est posé que par Playwright : il exempte le seul nom `localhost`
 * (flux de test servis en local), pas les IP internes écrites en clair.
 * shortcut: DNS rebinding possible entre ce lookup et la connexion de fetch — épingler l'IP via un dispatcher undici si besoin.
 */
async function assertPublicHost(url: string) {
  const hostname = new URL(url).hostname.replace(/^\[|\]$/g, "");
  if (process.env.ICAL_ALLOW_PRIVATE === "1" && hostname === "localhost") return;
  const addresses = await lookup(hostname, { all: true });
  if (addresses.some((a) => isPrivateAddress(a.address, a.family as 4 | 6))) {
    throw new Error(`Hôte iCal interne refusé : ${hostname}`);
  }
}

const MAX_REDIRECTS = 3;

/**
 * Synchronise une source iCal : fetch l'URL, parse les événements,
 * upsert dans ical_blocks, supprime les événements disparus.
 */
async function syncSource(source: {
  id: string;
  tenantId: string;
  roomId: string;
  url: string;
}) {
  // Import dynamique pour éviter le bundling statique (BigInt incompatible avec Turbopack)
  // Hors Next (tsx, sondes de test), l'interop CJS ne range l'API que sous `default`.
  const ical = await import("node-ical").then((m) => (m.sync ? m : (m as unknown as { default: typeof m }).default));

  // Fetch avec timeout de 15 secondes pour éviter le DOS
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let icsText: string;
  try {
    // Redirections suivies à la main (http→https, airbnb.fr→.com…) : chaque saut
    // repasse le contrôle d'hôte, sinon un 302 public mènerait au réseau interne.
    let url = source.url;
    let res: Response;
    for (let hop = 0; ; hop++) {
      await assertPublicHost(url);
      res = await fetch(url, { signal: controller.signal, redirect: "manual" });
      const location = res.headers.get("location");
      if (res.status < 300 || res.status >= 400 || !location) break;
      if (hop === MAX_REDIRECTS) throw new Error("Trop de redirections");
      url = new URL(location, url).toString();
      if (!/^https?:$/.test(new URL(url).protocol)) throw new Error("Redirection non HTTP refusée");
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    icsText = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  // Une page d'erreur HTML servie en 200 se parse en « zéro événement » : on
  // effacerait alors tous les blocs de la source et la chambre paraîtrait libre.
  if (!icsText.includes("BEGIN:VCALENDAR")) {
    throw new Error("Réponse sans calendrier iCal (BEGIN:VCALENDAR absent)");
  }

  const events = ical.sync.parseICS(icsText);

  const vevents: import("node-ical").VEvent[] = [];
  for (const e of Object.values(events)) {
    if (e && e.type === "VEVENT") vevents.push(e as import("node-ical").VEvent);
  }

  /** Extrait la valeur string d'un ParameterValue node-ical */
  function paramStr(val: unknown): string {
    if (typeof val === "string") return val;
    if (val && typeof val === "object" && "val" in val) return String((val as { val: unknown }).val);
    return "";
  }

  for (const event of vevents) {
    const uid = event.uid;
    const start = event.start ? new Date(String(event.start)) : null;
    const end = event.end ? new Date(String(event.end)) : null;
    const summary = paramStr(event.summary) || "Bloqué";

    if (!uid || !start || !end) continue;

    await db
      .insert(icalBlocks)
      .values({
        tenantId: source.tenantId,
        roomId: source.roomId,
        sourceId: source.id,
        uid,
        summary,
        start,
        end,
      })
      .onConflictDoUpdate({
        target: [icalBlocks.sourceId, icalBlocks.uid],
        set: { summary, start, end },
      });
  }

  // Supprimer les événements qui ont disparu de la source (annulations)
  const remoteUids = vevents
    .map((e) => e.uid)
    .filter((uid): uid is string => typeof uid === "string");

  if (remoteUids.length > 0) {
    await db
      .delete(icalBlocks)
      .where(
        and(
          eq(icalBlocks.sourceId, source.id),
          notInArray(icalBlocks.uid, remoteUids),
        ),
      );
  } else {
    // Source vide → supprimer tous les blocs de cette source
    await db
      .delete(icalBlocks)
      .where(eq(icalBlocks.sourceId, source.id));
  }

  // Mettre à jour le timestamp de dernière sync
  await db
    .update(icalSources)
    .set({ lastSyncAt: new Date() })
    .where(eq(icalSources.id, source.id));
}

/**
 * Lance la synchronisation des sources iCal actives d'un tenant.
 */
export async function syncTenantIcalSources(tenantId: string) {
  const sources = await db.query.icalSources.findMany({
    where: and(eq(icalSources.tenantId, tenantId), eq(icalSources.active, true)),
  });

  const results = { synced: 0, errors: 0 };

  for (const source of sources) {
    try {
      await syncSource(source);
      results.synced++;
    } catch (err) {
      results.errors++;
      console.error(`[iCal sync] Échec source ${source.id} (${source.name}):`, err);
    }
  }

  return results;
}

/**
 * Lance la synchronisation de toutes les sources iCal actives (tous tenants).
 */
export async function syncAllIcalSources() {
  const sources = await db.query.icalSources.findMany({
    where: eq(icalSources.active, true),
  });

  const results = { synced: 0, errors: 0 };

  for (const source of sources) {
    try {
      await syncSource(source);
      results.synced++;
    } catch (err) {
      results.errors++;
      console.error(`[iCal sync] Échec source ${source.id} (${source.name}):`, err);
    }
  }

  console.log(
    `[iCal sync] Terminé: ${results.synced} sources synchronisées, ${results.errors} erreurs`,
  );

  return results;
}
