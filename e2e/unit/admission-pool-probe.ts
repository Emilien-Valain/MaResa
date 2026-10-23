/**
 * Sonde exécutée en sous-processus par `admission-pool.spec.ts` (issue
 * audit-2026-10/01). Lance N admissions VRAIMENT simultanées sur la même
 * chambre/nuits, avec le pool de `lib/db` (max 10). Si une admission réclame une
 * 2e connexion en tenant déjà sa transaction, le pool s'épuise et tout gèle.
 * Imprime { finished, created, conflicts, poolOk } en JSON sur stdout.
 *
 * Usage : tsx admission-pool-probe.ts <tenantId> <roomId> <email>
 */
const [tenantId, roomId, email] = process.argv.slice(2);
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const N = 12;
const DEADLINE_MS = 8_000; // < connectionTimeoutMillis : un gel ne se « débloque » pas en erreur avant

async function main() {
  const { admitBooking, RoomUnavailableError } = await import("../../lib/booking-intake");
  const { db } = await import("../../lib/db");
  const { bookings } = await import("../../db/schema");
  const { sql } = await import("drizzle-orm");

  const checkIn = new Date("2027-10-04T00:00:00.000Z");
  const checkOut = new Date("2027-10-07T00:00:00.000Z");

  const admissions = Promise.allSettled(
    Array.from({ length: N }, (_, i) =>
      admitBooking({ roomId, tenantId, checkIn, checkOut, guestCount: 1 }, { enforceRules: true }, (tx, { breakdown }) =>
        tx.insert(bookings).values({
          tenantId,
          roomId,
          checkIn,
          checkOut,
          totalPrice: breakdown.totalPrice.toFixed(2),
          status: "pending",
          guestName: `Flood ${i}`,
          guestEmail: email,
        }),
      ),
    ),
  );
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), DEADLINE_MS));
  const results = await Promise.race([admissions, timeout]);

  const poolOk = await Promise.race([
    db.execute(sql`select 1`).then(() => true, () => false),
    new Promise<false>((r) => setTimeout(() => r(false), 2_000)),
  ]);

  console.log(
    JSON.stringify({
      finished: results !== null,
      created: results?.filter((r) => r.status === "fulfilled").length ?? 0,
      conflicts:
        results?.filter((r) => r.status === "rejected" && r.reason instanceof RoomUnavailableError).length ?? 0,
      poolOk,
    }),
  );
  process.exit(0); // un pool gelé garde des sockets ouverts
}

main();
