# getAvailableRooms: per-room manual-block filter is a no-op

Status: resolved — ADR-0007 (module Hold). Le filtre mort a disparu : `getAvailableRooms` dérive désormais de `blockedDates` (`lib/holds.ts`), plus de sous-requête manuelle par chambre. A aussi révélé le bug B (récurrent scopé chambre jamais checké sans blocage global), corrigé du même coup. Tests : `e2e/public/holds.spec.ts`.

## Problem

In `lib/availability.ts:95`, the per-room manual-block subquery contains:

```ts
manualBlocks.roomId !== null ? undefined : undefined,
```

Both branches are `undefined`, so the condition is dead — it filters nothing. The intent was presumably to restrict to room-scoped (non-global) manual blocks, i.e. `isNotNull(manualBlocks.roomId)`. As written, the `selectDistinct({ roomId })` can return rows where `roomId` is null (global blocks), which are then filtered out app-side at line 132 (`r.roomId !== null`), so the *result* may be accidentally correct — but the SQL expresses nothing and is fragile.

Cross-check `hasManualBlockOverlap` / `getManualBlockedDates` in `lib/manual-blocks.ts` for the same intent before fixing.

## Fix

Replace the no-op with the intended predicate (`isNotNull(manualBlocks.roomId)`), and verify global manual blocks are still handled by the dedicated `globalManualBlocks` query below it. Add a test: a room-scoped manual block excludes only that room; a global block excludes all.

## Comments
