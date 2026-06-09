# Pricing resolution is precedence-based (priority + specificity), and rules may lower the price

Each night's price is the room's base price unless a pricing rule applies. When several rules match a night, the winner is chosen by **precedence, not by "highest amount"**:

1. Highest explicit `priority`.
2. Tie → most specific: room-scoped > global; day-of-week-restricted > all-days; narrower date window > all-year.
3. Tie → most recently created.

The winning rule's price is applied directly — `fixedPrice` as-is, or `base × (1 + percentageModifier/100)` — clamped at 0. **There is no base-price floor: a rule may set a price below base (a promo).**

This replaces the previous "highest price wins" rule, which (a) made promos impossible to charge — base was a hard floor, so a negative modifier was computed and discarded — and (b) ignored the existing `priority` column entirely.

Worked example: base 100 €; July–August season 120 €; Saturday-in-season 130 € (beats the season rule by day-of-week specificity, not by being larger); an Aug 15–20 −30 % promo at higher priority beats both → 70 €.

The common season/Saturday case needs no manual priority — specificity resolves it. `priority` is only needed for counterintuitive overrides (a promo beating a surge); the admin UI defaults promo-style rules to a high priority.

Display must equal charge: the "à partir de X €/nuit" figure (`getMinPricePerNight`) is derived from this same resolver over a forward horizon, so a listing can never advertise a price the booking flow won't honor.

This unifies pricing with the existing booking-rules resolution (room overrides global, seasonal beats year-round) — one precedence model across both resolvers.
