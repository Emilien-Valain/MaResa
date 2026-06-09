# Availability is computed once, through the Hold module

A room is unavailable for a date when **any** source holds it: a [[booking]] (`pending` + `confirmed`), an imported `ical_block`, or a `manual_block` (including a weekly recurrence). We name that union a **Hold** — a span `[start, end)` a room is held, whatever the cause (see CONTEXT.md). Availability is its complement.

The overlap predicate `source.start < windowEnd && source.end > windowStart`, and the weekly-recurrence expansion, were each hand-written across four consumers — `isRoomAvailable`, `getAvailableRooms`, `getBlockedDates`, and the public iCal export — which had **drifted apart**. We collapse them onto a single seam:

```ts
// lib/holds.ts
blockedDates(roomId, tenantId, window): Promise<Set<IsoDate>>   // YYYY-MM-DD, UTC
```

`blockedDates` enumerates every held date in `window`, fetching all three sources under the one overlap predicate and materializing each (intervals expanded day-by-day, recurrence expanded by weekday) into one set. Every consumer derives from it:

- `isRoomAvailable(r, ci, co)` → `blockedDates(r, {ci, co}).size === 0`
- `getBlockedDates` (date-picker) → the sorted set
- `getAvailableRooms` → per-room emptiness over the window
- iCal export → `coalesce(blockedDates)` back into intervals → VEVENTs

`coalesce` (sorted dates → consecutive `[start, end)` intervals) is a pure presentation helper, not a second seam.

## Why a single date-set seam (not two methods, not intervals)

We rejected a wider interface (`overlaps` boolean + `blockedDates`) and an interval-returning seam. Both exist only to preserve an SQL short-circuit for the "is this one room free?" query. At small-hotel data volume that saves nothing measurable, and the narrow seam makes the date-picker trivial and guarantees all consumers agree by construction. We accept that `getAvailableRooms` becomes N per-room queries instead of one.

## Recurrence semantics (pins thread #4)

For a recurring `manual_block`: `startDate` is the anchor (lower bound), `recurrenceUntil` is the **exclusive** upper bound (`NULL` = open-ended, bounded only by the always-finite query window), `recurrenceDays` are the held weekdays, and `endDate` is **unused**. Exclusivity keeps the half-open `[start, end)` convention uniform with [[night|nights]] and bookings. This ratifies the existing code; no migration. Documented in `Schema DB.md`.

## Defects this fixes (same root cause: each path recomputed Holds)

- **Dead filter**: `getAvailableRooms` carried `manualBlocks.roomId !== null ? undefined : undefined` — a no-op predicate.
- **Room-scoped recurring blocks leaked**: `getAvailableRooms` only checked recurring manual blocks when a *global* block also existed, so a room-scoped weekly closure left that room advertised as available — while `isRoomAvailable` (single room) handled it. The two paths now share one seam.
- **iCal export under-broadcast**: the feed emitted bookings only, never re-exporting imported `ical_blocks` or `manual_blocks` — the exact "confirmed bookings only" path **ADR-0004 already rejected**. This ADR operationalizes ADR-0004 by routing the export through `blockedDates`; an admin's manual closure now reaches every channel.

## Consequences

One module owns the overlap predicate and recurrence expansion; correctness lives in one test surface. `getAvailableRooms` trades a single SQL filter for N small per-room reads (acceptable at target volume). `lib/manual-blocks.ts`'s duplicated expansion is absorbed into `lib/holds.ts`.
