/**
 * Rate limiter in-memory simple pour le middleware Next.js.
 * Chaque règle a sa propre fenêtre (sliding window par IP).
 * Suffisant pour un déploiement single-instance (Coolify).
 */

type Entry = {
  count: number;
  resetAt: number;
};

const stores = new Map<string, Map<string, Entry>>();

// Nettoyage périodique des entrées expirées (toutes les 60 s)
setInterval(() => {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }
}, 60_000);

export type RateLimitRule = {
  /** Identifiant unique de la règle */
  name: string;
  /** Nombre max de requêtes dans la fenêtre */
  limit: number;
  /** Fenêtre en secondes */
  windowSec: number;
};

/**
 * Vérifie si l'IP a dépassé la limite pour cette règle.
 * Retourne { limited: false } si ok, { limited: true, retryAfter } si bloqué.
 */
export function checkRateLimit(
  rule: RateLimitRule,
  ip: string,
): { limited: false } | { limited: true; retryAfter: number } {
  if (!stores.has(rule.name)) {
    stores.set(rule.name, new Map());
  }
  const store = stores.get(rule.name)!;
  const now = Date.now();

  const entry = store.get(ip);

  if (!entry || entry.resetAt <= now) {
    store.set(ip, { count: 1, resetAt: now + rule.windowSec * 1000 });
    return { limited: false };
  }

  entry.count++;

  if (entry.count > rule.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false };
}
