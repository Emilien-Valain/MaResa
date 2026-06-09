# Every booking is created through one admission gate

A [[booking]] can be created two ways: a [[guest]] on the public site (`createBookingPublic`) or an [[admin]] entering one by hand (`createBookingManual`). These had **drifted**: the public path resolved+authorized the room, checked availability, validated booking-rules, and priced; the manual path did **none of that** — it inserted a `confirmed` booking straight from form input. An admin could silently double-book, and a manual `roomId` was never checked against the tenant (a cross-tenant integrity hole).

We collapse the shared pre-insert logic into one seam:

```ts
// lib/booking-intake.ts
admitBooking({ roomId, tenantId, checkIn, checkOut }, { enforceRules?, allowOverlap? })
  : Promise<{ room; breakdown }>
```

`admitBooking` runs the gate — resolve+authorize the room (tenant-owned + active), check availability against the [[hold|Holds]] (`lib/holds.ts`, ADR-0007), optionally validate booking-rules, compute the price — and throws an explicit French error on rejection. The two callers diverge only **after** admission: public inserts `pending` + creates the Stripe session; manual inserts `confirmed`. This makes "what does it take for a booking to be admissible?" answerable in one place, and guarantees a manual booking can no longer skip a check a public one runs.

## The two axes are parameters, not separate code paths

- **`enforceRules`** — public `true`, manual `false`. Booking-rules (minStay, allowed check-in days…) are public-site constraints; an admin reconciling a real-world reservation should not be bound by them (e.g. a legitimate 1-night stay where the public minStay is 2).
- **`allowOverlap`** — manual `false` by default, set `true` only when the admin ticks **« Forcer »** in the form (thread #1). The safe default rejects an overlap (no more silent double-book); the explicit override lets an admin record a reservation already honored off-platform over held dates. Public never overrides.

## Domain rule established

A **manual** booking may be *admitted over an existing Hold* — a deliberate admin override. A **direct** booking never may: the public engine always rejects overlap. This asymmetry is recorded on [[source]] in CONTEXT.md. Overriding inserts a booking that itself becomes a Hold, so a forced overlap is visible to every later admission and to the iCal export (ADR-0004) — the override is auditable, not silent.

## Rejected alternatives

- *Validate manual exactly like public (no override)* — removes the legitimate off-platform reconciliation case the admin needs.
- *Keep manual unvalidated, warn in the UI only* — leaves the silent double-book possible at the data layer if the warning is ignored; the gate should be the source of truth, not the form.

## Consequences

`createBookingPublic` and `createBookingManual` shrink to "admit, then persist". The room-ownership check now also covers the manual path. Booking-rules resolution itself is unchanged here (the room-overrides-global question is thread #3, out of scope). `admitBooking` is the single test surface for admissibility.
