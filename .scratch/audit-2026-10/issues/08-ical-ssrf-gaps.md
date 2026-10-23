# iCal import URL check misses internal targets (SSRF)

Status: resolved — sync iCal : contrôle DNS anti-réseau-interne (net.BlockList) + redirect:"error" au fetch, 169.254 ajouté au schéma
Group: Should fix

## Problem

Tenant admins enter iCal URLs (`lib/actions/ical-sources.ts` → `icalSourceSchema`); the server fetches them every 15 min (`lib/ical-sync.ts:23`). SSRF = making the server call internal addresses.

The blocklist `BLOCKED_HOSTS` (`lib/validation.ts:61`) only matches the hostname text. Passing today:
- `http://169.254.169.254/latest/meta-data/` (cloud metadata, link-local)
- Docker service names: `http://maresa-pg:5432/`, `http://coolify:8000/`
- A public domain whose DNS resolves to `10.x` / `127.x` (e.g. `127.0.0.1.nip.io`)
- A public URL that 302-redirects to an internal host (`fetch` follows redirects)
- IPv6 ULA / mapped forms (`[fc00::1]`, `[::ffff:127.0.0.1]`)

Impact: blind GET requests from the server into the private network, triggered by any tenant admin.

## Fix

In `syncSource` (fetch time, so DNS changes are covered too):
1. `fetch(url, { redirect: "error", signal })`.
2. Before fetching: `dns.promises.lookup(hostname, { all: true })`; reject if any address is loopback, private (10/8, 172.16/12, 192.168/16), link-local (169.254/16, fe80::/10), ULA (fc00::/7), unspecified, or IPv4-mapped forms of these. Use `net.BlockList` (Node stdlib) — no new dependency.
3. Keep the schema check as a fast first filter; add `169.254.` there too.

Known residual (accept, document with a `shortcut:` comment): DNS rebinding between lookup and connect.

## Acceptance

- Unit/E2E test: sources pointing to `http://169.254.169.254/`, `http://localhost.nip.io` style host (or a hostname mocked to resolve private), and a redirecting URL all fail sync with an error and create no blocks.
- Existing `e2e/admin/ical-sync.spec.ts` still passes (check how it serves its fixture feed — if it uses localhost, add a test-only allowance via env, e.g. `ICAL_ALLOW_PRIVATE=1` set only in Playwright config).
- Obsidian `iCal Sync.md` + test spec updated.

## Comments

### 2026-10-23 — résolu
- `lib/ical-sync.ts` : `assertPublicHost` avant chaque fetch (`dns.promises.lookup(all)` + `net.BlockList` : 0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.168/16, ::, ::1, fc00::/7, fe80::/10 ; les IPv4-mappées sont couvertes nativement par BlockList). `fetch(..., { redirect: "error" })`. `isPrivateAddress` exporté pour le test. Résiduel DNS rebinding documenté en `shortcut:`.
- `lib/validation.ts` : `169.254.x.x` ajouté à `BLOCKED_HOSTS`.
- `playwright.config.ts` : `ICAL_ALLOW_PRIVATE=1` dans l'env du webServer (le test existant `ical-sync.spec.ts` vise `localhost:3001`). La dérogation ne lève que le contrôle DNS, pas le refus des redirections.
- Écart : `lib/ical-sync.ts` gagne une ligne d'interop pour `import("node-ical")` (hors Next/tsx, l'API n'est que sous `default`) — nécessaire pour exercer la vraie sync depuis une sonde tsx ; sans effet sous Next.
- Écart : pas de test sur un vrai `*.nip.io` (internet) — `localhost` (nom résolu en 127.0.0.1) et `[::ffff:127.0.0.1]` jouent ce rôle ; 169.254.169.254 couvert par le test logique pur + schéma.
- Tests : `e2e/unit/ical-ssrf.spec.ts` + `e2e/unit/ical-ssrf-probe.ts` (serveur HTTP local servant un .ics valide, sources sur le tenant rival, nettoyées). Fix retiré → sync (2 sources internes importent 1 bloc chacune, redirect aussi) et schéma échouent. `e2e/admin/ical-sync.spec.ts` passe toujours.
- Suite complète : 291 passed, 3 skipped, 1 failed (`e2e/auth/login.spec.ts:87`, échec connu préexistant). `tsc --noEmit` OK.
- Obsidian : `iCal Sync.md` (section Anti-SSRF) + `Tests de non-régression.md` (iCal sources › Sécurité).
- 2026-10-24 — User decision: follow redirects instead of refusing them. `syncSource` now follows ≤ 3 redirects manually (`redirect: "manual"`), re-running `assertPublicHost` on every hop; >3 → « Trop de redirections »; non-HTTP Location refused. `ICAL_ALLOW_PRIVATE=1` narrowed to the hostname `localhost` only, so the probe can prove a redirect to `127.0.0.1` is refused at hop 2. Probe cases: redirect/threeHops → 1 block, fourHops/redirectToInternal/internalIp → 0 (each refused for the expected reason). Old code (`redirect: "error"`) gives 0 for redirect/threeHops → test fails on it.
