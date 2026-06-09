# Booking rules: a room rule overrides global rules entirely (no field merge)

Status: needs-triage

## Open question

Per `Architecture.md` and `lib/booking-rules.ts`, when a room has any booking rule, it overrides the global rules **entirely** — not field-by-field. So a room rule that sets only `minStay` *wipes* the global `allowedCheckInDays` / `allowedCheckOutDays` / `maxStay`, which silently revert to "no constraint" for that room.

Is whole-record override the intent, or should room rules **merge** over globals field-by-field (room value wins per field, global fills the gaps)?

Note this resolves *differently* from pricing, which we just made precedence-based per **night** (ADR-0006). Booking rules currently resolve per *booking* by scope+seasonality. Worth deciding whether the two should share a model.

## To grill

Walk a concrete case: global = `minStay 2, checkInDays [Fri,Sat]`; room = `minStay 3` only. Should that room still be restricted to Fri/Sat check-in (merge) or accept any day (current: entire override)? Decide, align the doc, and either confirm or file the change.

## Comments
