# Rooms with the same name share a slug; the second is unreachable publicly

Status: resolved — slug unique par tenant (index unique + suffixe -<id6> si doublon/vide), migration 0007 dédoublonnante
Group: Should fix

## Problem

`lib/actions/rooms.ts:56,80` sets `slug: slugify(name)`. The index `rooms_slug_tenant_idx` (`db/schema.ts`) is not unique. `getRoomBySlugPublic` (`lib/queries/public.ts:19`) returns the first match.

Failure cases: two rooms named "Chambre Double" → `/chambres/chambre-double` always shows the first. A name with no Latin letters (e.g. "客房") → empty slug → broken link.

## Fix

- Make the index unique on `(tenant_id, slug)` (Drizzle `uniqueIndex`; generate a migration with `npm run db:generate`; the migration must first de-duplicate existing rows, e.g. append `-<first 6 chars of id>` to later duplicates).
- In create/update: if the slug is empty or already used by another room of the tenant, append `-<first 6 chars of room id>` (for create, generate the id with `crypto.randomUUID()` before insert).

## Acceptance

- Create two rooms with the same name → both public pages reachable, distinct URLs.
- Room named with only non-Latin characters → non-empty slug, page reachable.
- Renaming a room to another room's name → no error, unique slug.
- Tests in `e2e/admin/chambres.spec.ts`, cleanup created rooms. Obsidian `Schema DB.md` + test spec updated.

## Comments

### 2026-10-23 — agent
- `db/schema.ts` : `rooms_slug_tenant_idx` passe en `uniqueIndex`.
- `db/migrations/0007_unique_room_slug.sql` (généré par `drizzle-kit generate --name unique_room_slug`, puis édité) : un `UPDATE` dédoublonne d'abord (les doublons `(tenant_id, slug)` suivants, ordre `created_at, id`, et les slugs vides reçoivent `-<6 premiers car. de l'id>`, vide → `chambre-<id6>`), puis DROP/CREATE UNIQUE INDEX. Vérifié sur une copie jetable de la DB de test avec doublons + slug vide injectés. Appliqué à `maresa_test` uniquement (psql — pas de table `__drizzle_migrations`, les migrations sont appliquées à la main).
- `lib/actions/rooms.ts` : `uniqueRoomSlug(tenantId, roomId, name)` — slug de base si non vide et libre (en excluant la chambre elle-même, donc ré-enregistrer ne change pas l'URL) ; sinon `<base|chambre>-<id6>`. `createRoom` génère l'id avec `crypto.randomUUID()` avant l'insert.
- Écart : slug vide → `chambre-<id6>` plutôt que `-<id6>` (lisible, pas de tiret initial).
- Limites connues : deux créations simultanées du même nom → la seconde lève une violation d'unicité (500) au lieu d'être suffixée ; idem si une chambre s'appelle littéralement « X abc123 » et qu'une autre reçoit `x-abc123`. Rarissime, non traité. Les anciens liens d'une chambre renommée ne redirigent pas (déjà le cas avant).
- Tests : `e2e/admin/chambres.spec.ts` (3 tests : même nom ×2 + stabilité au ré-enregistrement, renommage vers le nom d'une autre, nom non latin) ; helpers `getRoomsByName` / `deleteRoomsByName` dans `e2e/helpers/intake.ts`. Les 3 échouent sur l'ancien code (ancien `rooms.ts` + ancien index non unique).
- Suite complète : 294 passed, 3 skipped, 1 failed (`e2e/auth/login.spec.ts:87`, échec connu pré-existant).
- **À faire par l'utilisateur** : appliquer `0007_unique_room_slug.sql` à la DB dev/prod (`DATABASE_URL`).
- 2026-10-24 — User decisions: keep `chambre-<id6>` for empty slugs; no redirect from an old slug after rename for now (revisit before launch if room pages get indexed/shared: `previous_slugs` column + 301).
- Dev DB (`maresa`) was never migrated through drizzle-kit (no `drizzle.__drizzle_migrations`), so `npm run db:migrate` cannot apply 0007 there — see follow-up below.
