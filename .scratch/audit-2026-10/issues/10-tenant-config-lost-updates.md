# Concurrent settings saves overwrite each other (tenant config JSON)

Status: resolved — every tenants.config writer now sends only its keys, merged atomically in SQL (`mergeTenantConfig`)
Group: Should fix

## Problem

All tenant settings live in `tenants.config` (jsonb). Seven writers do read → spread → write the whole object:
- `lib/actions/content.ts:50-72`
- `lib/actions/general.ts`, `lib/actions/location.ts`, `lib/actions/theme.ts`, `lib/actions/email-settings.ts`
- `app/api/admin/hero-photo/route.ts`, `app/api/admin/gallery-photos/route.ts` (slow: sharp processing between read and write)

Failure case: admin uploads a gallery photo in one tab while saving the content tab in another; whichever write lands last silently drops the other's keys.

## Fix

Each writer sends only the keys it owns, merged in SQL:
```ts
.set({ config: sql`coalesce(${tenants.config}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb` })
```
Keys that must be cleared (today set to `undefined` and dropped by the spread) need `null` in the patch, or use `config - 'key'`. Check how templates read cleared keys (`?? default`) so `null` behaves like absent.

Gallery/hero writes that append to an array still read-modify-write that one key; acceptable (single key, same admin) — note it with a `shortcut:` comment.

## Acceptance

- Test: save content settings and location settings in parallel (two pages / `Promise.all`) → both changes persisted.
- Clearing a field (empty input) still clears it on the public site.
- Existing `parametres` / `content-settings` / `gallery-photos` tests pass. Obsidian spec updated.

## Comments

### 2026-10-23 — résolution
- Nouveau `lib/tenant-config.ts` : `mergeTenantConfig(patch)` renvoie la valeur SQL `(coalesce(config,'{}') - <clés à undefined>::text[]) || <patch>::jsonb` à passer à `.set({ config })`. Utilisé par `lib/actions/{content,general,location,theme,email-settings}.ts` (plus de SELECT préalable) et par `writeConfig` des routes `app/api/admin/{hero-photo,gallery-photos}/route.ts` (patch = `{ heroPhoto }` / `{ galleryPhotos }` seulement).
- Écart avec la suggestion : au lieu d'envoyer `null` pour les champs vidés, les clés à `undefined` sont retirées par `config - text[]` → le JSON reste identique à l'ancien comportement (clé absente), aucun lecteur à vérifier. `heroPhoto: null` (suppression hero) reste stocké tel quel, comme avant.
- `galleryPhotos` reste lu-modifié-écrit pour cette seule clé (`shortcut:` dans la route), comme accepté par l'issue.
- Disparition du `throw "Tenant introuvable"` dans les 5 actions : le tenant vient de la session, un UPDATE sans ligne ne fait rien.
- Tests : `e2e/admin/config-concurrency.spec.ts` — (1) upload galerie de 4 images 24 Mpx + sauvegarde Contenu pendant le traitement sharp (le test vérifie que l'upload finit après la sauvegarde) → titre et photos conservés ; (2) upload hero ∥ galerie → les deux conservés ; (3) vider un champ retire la clé, les autres restent. (1) et (2) échouent sur l'ancien code (routes revenues à HEAD : `heroTitle` undefined, `galleryPhotos` vide) ; (3) est un garde-fou du vidage, passe dans les deux cas. Le test « content ∥ location en parallèle via 2 pages » de l'acceptance n'a pas été écrit : fenêtre SELECT→UPDATE de quelques ms, non déterministe ; le scénario upload lent ∥ sauvegarde couvre le même bug de façon fiable.
- Obsidian : section « Sauvegardes concurrentes de la config (audit 2026-10/10) » sous Admin — Page Paramètres.
- Suite complète : 296 passed, 3 skipped, 1 failed (`auth/login.spec.ts:87`, connu), 1 flaky (`empty-states.spec.ts:40`, timeout du beforeAll à la compilation à froid du login sous-domaine, passe au retry — sans lien). `tsc --noEmit` OK.
