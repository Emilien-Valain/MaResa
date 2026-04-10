/**
 * Script de migration autonome pour la production.
 * Utilise uniquement `pg` (présent dans les dépendances de prod).
 * Reproduit le comportement de drizzle-kit migrate :
 * - Lit le journal (_journal.json) pour connaître les migrations
 * - Utilise la table __drizzle_migrations pour tracker ce qui a déjà été appliqué
 * - Applique les migrations manquantes dans l'ordre
 *
 * Usage : node scripts/migrate.mjs
 */

import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "db", "migrations");

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();

  try {
    // Créer la table de tracking si elle n'existe pas (même schéma que drizzle-kit)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT
      )
    `);

    // Lire le journal
    const journal = JSON.parse(
      readFileSync(join(migrationsDir, "meta", "_journal.json"), "utf-8"),
    );

    // Récupérer les migrations déjà appliquées
    const { rows: applied } = await client.query(
      `SELECT hash FROM "__drizzle_migrations" ORDER BY id`,
    );
    const appliedHashes = new Set(applied.map((r) => r.hash));

    let count = 0;

    for (const entry of journal.entries) {
      const hash = entry.tag;

      if (appliedHashes.has(hash)) continue;

      const sqlFile = readFileSync(
        join(migrationsDir, `${hash}.sql`),
        "utf-8",
      );

      // Drizzle utilise `--> statement-breakpoint` comme séparateur
      const statements = sqlFile
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean);

      await client.query("BEGIN");
      try {
        for (const stmt of statements) {
          await client.query(stmt);
        }

        await client.query(
          `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
          [hash, entry.when],
        );

        await client.query("COMMIT");
        console.log(`✓ ${hash}`);
        count++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`✗ ${hash}:`, err.message);
        throw err;
      }
    }

    if (count === 0) {
      console.log("Base de données à jour — aucune migration à appliquer.");
    } else {
      console.log(`${count} migration(s) appliquée(s).`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration échouée:", err);
  process.exit(1);
});
