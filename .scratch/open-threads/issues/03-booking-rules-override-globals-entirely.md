# Booking rules: a room rule overrides global rules entirely (no field merge)

Status: resolved — ADR-0009. Décision : **merge par champ** par précédence partagée avec le pricing (`lib/rule-precedence.ts`). `getEffectiveRules` fold désormais champ par champ : chaque contrainte prend la valeur de la règle de plus haute précédence qui la définit. Plus d'override de bloc ; résolution priority-first (alignée ADR-0006), plus saisonnière-first. Tests : `e2e/admin/rule-resolution.spec.ts`. Doc : Architecture.md + CONTEXT.md (Pricing rule).

## Open question

Per `Architecture.md` and `lib/booking-rules.ts`, when a room has any booking rule, it overrides the global rules **entirely** — not field-by-field. So a room rule that sets only `minStay` *wipes* the global `allowedCheckInDays` / `allowedCheckOutDays` / `maxStay`, which silently revert to "no constraint" for that room.

Is whole-record override the intent, or should room rules **merge** over globals field-by-field (room value wins per field, global fills the gaps)?

Note this resolves *differently* from pricing, which we just made precedence-based per **night** (ADR-0006). Booking rules currently resolve per *booking* by scope+seasonality. Worth deciding whether the two should share a model.

## To grill

Walk a concrete case: global = `minStay 2, checkInDays [Fri,Sat]`; room = `minStay 3` only. Should that room still be restricted to Fri/Sat check-in (merge) or accept any day (current: entire override)? Decide, align the doc, and either confirm or file the change.

## Comments
