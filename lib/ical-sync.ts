import { and, eq, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { icalSources, icalBlocks } from "@/db/schema";

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
  const ical = await import("node-ical");
  const events = await ical.async.fromURL(source.url);

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
