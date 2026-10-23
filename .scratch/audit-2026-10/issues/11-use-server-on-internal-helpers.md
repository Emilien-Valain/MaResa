# Remove `"use server"` from internal domain helpers

Status: resolved — "use server" supprimé de lib/pricing.ts, lib/booking-rules.ts, lib/availability.ts (helpers serveur internes, plus jamais exposables en server actions)
Group: Should fix

## Problem

`lib/pricing.ts:1`, `lib/booking-rules.ts:1`, `lib/availability.ts:1` start with `"use server"`. That makes every exported async function a server action (a public, unauthenticated endpoint) as soon as any client component imports it. None of them check auth, and all take `tenantId` as a parameter — e.g. `getAvailableRooms(anyTenantId, …)`, `calculatePrice(…)` with an unbounded range (see 02).

Today no client component imports them (verified by grep), so this is latent — but the directive serves no purpose; they are plain server-side helpers called from routes and actions.

## Fix

Delete the three `"use server"` lines. Optionally add `import "server-only"` if the package is already available (do not add a dependency for it).

## Acceptance

- `npm run build` passes.
- Full `npm test` passes.

## Comments

### 2026-10-23
- Supprimé la ligne `"use server";` (et la ligne vide qui suivait) en tête des trois fichiers. Rien d'autre modifié ; le paramètre `conn` ajouté par 01 est conservé.
- Importeurs vérifiés : uniquement des routes API, des pages server components, `lib/booking-intake.ts` et `lib/actions/bookings.ts` (lui-même `"use server"`, qui appelle `calculatePrice` côté serveur). Aucun composant `"use client"` ne les importe → rien ne casse.
- `server-only` n'est pas installé → non ajouté (pas de nouvelle dépendance, comme demandé).
- Pas de test E2E ajouté : Next ne génère un ID d'action que si un composant client importe la fonction ; aucun ne le faisait, donc aucun endpoint n'existait à tester et un test n'aurait pas pu échouer sur l'ancien code. La suite existante couvre les appelants.
- `npx tsc --noEmit -p .` OK, `npx next build` OK, `npm test` : 296 passed, 3 skipped, 1 failed connu (`auth/login.spec.ts:87`), 1 flaky connu (`admin/empty-states.spec.ts:40`, timeout de compilation à froid).
- Obsidian : aucun changement de comportement ni de test ; `Architecture.md` ne mentionne pas ces directives → non modifié.
