import { sql } from "drizzle-orm";
import { tenants } from "@/db/schema";
import type { TenantConfig } from "@/lib/tenant-context";

/**
 * Valeur de `tenants.config` pour un `.set()` : fusionne `patch` côté SQL, de façon
 * atomique. Chaque écrivain n'envoie que ses clés → deux sauvegardes simultanées
 * (onglets différents, upload photo lent…) ne s'écrasent plus.
 * Une clé à `undefined` est retirée du JSON (lue comme absente, comme avant).
 */
export function mergeTenantConfig(patch: Partial<TenantConfig>) {
  const removed = Object.keys(patch).filter(
    (k) => patch[k as keyof TenantConfig] === undefined,
  );
  // Les clés sont des noms de champs TenantConfig (pas de virgule ni d'accolade).
  return sql`(coalesce(${tenants.config}, '{}'::jsonb) - ${`{${removed.join(",")}}`}::text[]) || ${JSON.stringify(patch)}::jsonb`;
}
