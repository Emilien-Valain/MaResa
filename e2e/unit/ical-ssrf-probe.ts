/**
 * Sonde exécutée en sous-processus par `ical-ssrf.spec.ts` (issue
 * audit-2026-10/08). Sert un vrai flux .ics sur un serveur HTTP local, crée des
 * sources iCal (tenant rival) qui le visent, lance la sync et compte les blocs
 * importés par source. Hors Playwright : ICAL_ALLOW_PRIVATE n'est pas posé.
 * Imprime { [nom de source]: { blocks, synced } } en JSON sur stdout.
 *
 * Usage : tsx ical-ssrf-probe.ts <tenantId> <roomId>
 */
import http from "node:http";
import type { AddressInfo } from "node:net";

const [tenantId, roomId] = process.argv.slice(2);
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
delete process.env.ICAL_ALLOW_PRIVATE;

const ICS = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "UID:ssrf-probe@test",
  "DTSTART;VALUE=DATE:20310610",
  "DTEND;VALUE=DATE:20310612",
  "SUMMARY:Réservé",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

async function main() {
  const { syncTenantIcalSources } = await import("../../lib/ical-sync");
  const { db } = await import("../../lib/db");
  const { icalSources, icalBlocks } = await import("../../db/schema");
  const { eq, inArray } = await import("drizzle-orm");

  const server = http.createServer((req, res) => {
    const hop = /^\/hop\/(\d+)$/.exec(req.url ?? "");
    if (req.url === "/redirect") {
      res.writeHead(302, { Location: "/feed.ics" }).end();
    } else if (req.url === "/to-internal") {
      // Saut vers une IP interne écrite en clair : non couverte par la dérogation `localhost`.
      res.writeHead(302, { Location: `http://127.0.0.1:${port}/feed.ics` }).end();
    } else if (hop) {
      const n = Number(hop[1]);
      res.writeHead(302, { Location: n > 1 ? `/hop/${n - 1}` : "/feed.ics" }).end();
    } else {
      res.writeHead(200, { "Content-Type": "text/calendar" }).end(ICS);
    }
  });
  await new Promise<void>((r) => server.listen(0, "::", r)); // double pile : ::ffff:127.0.0.1 joignable
  const port = (server.address() as AddressInfo).port;

  const result: Record<string, { blocks: number }> = {};
  // Phase = ensemble de sources synchronisées ensemble, avec ou sans dérogation de test.
  async function phase(allowPrivate: boolean, urls: Record<string, string>) {
    if (allowPrivate) process.env.ICAL_ALLOW_PRIVATE = "1";
    else delete process.env.ICAL_ALLOW_PRIVATE;
    const rows = await db
      .insert(icalSources)
      .values(Object.entries(urls).map(([name, url]) => ({ tenantId, roomId, name, url })))
      .returning({ id: icalSources.id, name: icalSources.name });
    const ids = rows.map((r) => r.id);
    try {
      await syncTenantIcalSources(tenantId);
      for (const r of rows) {
        const blocks = await db.select().from(icalBlocks).where(eq(icalBlocks.sourceId, r.id));
        result[r.name] = { blocks: blocks.length };
      }
    } finally {
      await db.delete(icalBlocks).where(inArray(icalBlocks.sourceId, ids));
      await db.delete(icalSources).where(inArray(icalSources.id, ids));
    }
  }

  try {
    await phase(false, {
      localhost: `http://localhost:${port}/feed.ics`, // nom qui résout vers 127.0.0.1 (cas *.nip.io)
      mapped: `http://[::ffff:127.0.0.1]:${port}/feed.ics`, // IPv4-mappée, passe le filtre texte
    });
    await phase(true, {
      allowed: `http://localhost:${port}/feed.ics`, // témoin : le flux est bien importable
      redirect: `http://localhost:${port}/redirect`, // suivie
      threeHops: `http://localhost:${port}/hop/3`, // 3 redirections : la limite, suivie
      fourHops: `http://localhost:${port}/hop/4`, // au-delà : refusée
      redirectToInternal: `http://localhost:${port}/to-internal`, // re-contrôle à chaque saut
      internalIp: `http://127.0.0.1:${port}/feed.ics`, // la dérogation ne couvre que le nom localhost
    });
  } finally {
    server.close();
  }
  console.log(JSON.stringify(result));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
