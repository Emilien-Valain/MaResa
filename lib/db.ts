import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import * as relations from "@/db/relations";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Pool épuisé → erreur au lieu d'une attente infinie qui gèle tout le site.
  connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema: { ...schema, ...relations } });
