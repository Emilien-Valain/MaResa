# Open threads — backlog for the next /grill-with-docs

These are domain/design questions surfaced during the 2026-06 grilling session but **not yet resolved**. Each needs a decision before it becomes a clean issue or ADR.

**If you're running `/grill-with-docs`: start here.** Read each issue below, then grill the user on the open question, and on resolution update `CONTEXT.md` / write an ADR / promote the issue to `ready-for-agent` — same as the parent session.

Resolved decisions from that session live in `/CONTEXT.md` and `/docs/adr/0001`–`0006`. Already-filed bugs: `.scratch/timezone-dates/` and `.scratch/pricing-resolution/`.

## Threads
1. `issues/01-manual-booking-skips-availability-check.md` — admin manual booking can silently double-book. Bug or intentional override? *(needs-triage)*
2. `issues/02-getavailablerooms-manual-block-filter-noop.md` — per-room manual-block filter is a no-op (`roomId !== null ? undefined : undefined`). *(ready-for-agent)*
3. `issues/03-booking-rules-override-globals-entirely.md` — a room rule wipes global rules field-by-field. Intended? *(needs-triage)*
4. `issues/04-manual-block-recurrence-semantics.md` — `startDate`/`endDate` vs `recurrenceUntil` ambiguous for weekly blocks. *(needs-triage)*
