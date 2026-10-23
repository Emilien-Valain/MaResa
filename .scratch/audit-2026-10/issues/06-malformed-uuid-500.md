# Malformed IDs return 500 instead of 4xx; the existing test passes by accident

Status: resolved — `isUuid` guard on the 6 routes (400 public JSON APIs, 404 iCal export + PDF), 9 e2e cases
Group: Should fix

## Problem

These routes pass an ID straight to Postgres; a non-UUID string raises "invalid input syntax for type uuid" → 500:
- `app/api/availability/route.ts` (`roomId`, `tenantId`)
- `app/api/pricing/route.ts` (`roomId`, `tenantId`)
- `app/api/rules/route.ts` (`roomId`, `tenantId`)
- `app/api/rooms/available/route.ts` (`tenantId`)
- `app/api/ical/[roomId]/route.ts` (`roomId`)
- `app/api/admin/reservations/[id]/pdf/route.ts` (`id`)

`e2e/public/security.spec.ts:91` ("API availability rejette un roomId non-UUID") passes only because it omits `tenantId`, so the route returns 400 before reaching the DB. Real clients always send `tenantId`.

CLAUDE.md rule: invalid params → 404/400, never 500.

## Fix

Guard with the existing `isUuid` from `lib/validation.ts`: 400 for public JSON APIs, 404 for the iCal export and PDF route.

## Acceptance

- Fix the existing test to include a valid `tenantId`, and add equivalent cases for pricing, rules, rooms/available (bad tenantId), iCal export, PDF (authenticated) — all < 500.
- Obsidian spec updated.

## Comments

### 2026-10-23 — resolved
- **Changed**: `isUuid` guard (from `lib/validation.ts`) right after the "missing params" check in `app/api/availability/route.ts`, `app/api/pricing/route.ts`, `app/api/rules/route.ts` (roomId + tenantId → 400 `Identifiant invalide`), `app/api/rooms/available/route.ts` (tenantId → 400), `app/api/ical/[roomId]/route.ts` (→ 404 `Not Found`, same as an unknown room), `app/api/admin/reservations/[id]/pdf/route.ts` (→ 404 `Not found`, same as an unknown booking).
- **Deviation**: none. Header-injected `x-tenant-id` goes through the same guard (harmless: the middleware always injects a real UUID).
- **Tests**: `e2e/public/security.spec.ts` — the old "availability roomId non-UUID" test replaced by 7 parametrised cases that send every other param valid (incl. `tenantId`) and assert exactly 400: availability roomId/tenantId, pricing roomId/tenantId, rules roomId/tenantId (`' OR 1=1--`), rooms/available tenantId; plus a happy-path test (the 4 APIs still 200 with valid UUIDs) and an iCal test (`not-a-uuid` / `%3Cscript%3E` → 404, valid room → 200 VCALENDAR). `e2e/admin/reservations.spec.ts` — authenticated PDF `not-a-uuid` → exactly 404. All 9 break cases fail on the old code (guards disabled → 500), verified then restored. Read-only GETs, no DB data created.
- **Full suite** (`npm test`): 283 passed, 3 skipped, 1 failed = known pre-existing `e2e/auth/login.spec.ts:87` (XSS password, full-suite order only).
- **Not done (out of scope)**: `/api/rules?checkIn=abc` passes an Invalid Date to the rules query; not verified whether that 500s.
