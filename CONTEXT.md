# DirectLoc

White-label direct-booking platform for small independent hotels and short-term rental hosts. A single multi-tenant deployment serves each hotel its own themed booking site on its own domain; the operator manages everything (no client-facing configuration UI).

## Language

### Acteurs

**Tenant**:
A hotel business that is DirectLoc's customer — owns a domain, a theme, and its isolated data. The unit of data isolation: every row carries a `tenantId`. One hotel = one tenant; an operator running several hotels does so as several tenants linked to one [[admin]] via `user_tenants`. (See ADR-0002.)
_Avoid_: client, hôtel client, compte

**Admin**:
A logged-in `users` row authorized to manage one or more [[tenant|tenants]] (membership via `user_tenants`). Distinct from the [[operator]] (the human running DirectLoc) and from a [[guest]] (who never logs in).
_Avoid_: utilisateur, compte

**Property** — _not a domain concept._
The `properties` table is dormant: exactly one is auto-created per [[tenant]] and every room attaches to it. Reason about rooms as belonging to a tenant, not a property. "Multiple buildings under one site" is not a product capability. (See ADR-0002.)

**Guest**:
The person who reserves and stays. A single concept — the booker and the occupant are not distinguished (a head-count is just `guestCount`). Stored inline on a booking (`guestName`, `guestEmail`, …); there is no separate guest entity.
_Avoid_: client, voyageur, customer

**Operator**:
The human (DirectLoc itself) who creates tenants and runs the platform. Distinct from an _admin_, who is a logged-in user managing one or more tenants.
_Avoid_: owner, gérant

### Réservation & disponibilité

**Booking**:
A reservation record — a [[guest]] holding a room for a date interval, with a price and a [[booking-status|status]]. The `[checkIn, checkOut)` interval (the "séjour") is an aspect of the booking, not a separate entity.
_Avoid_: réservation, résa, séjour, stay

**Block**:
A non-booking source of unavailability: either an **iCal block** (imported from an external channel via iCal) or a **manual block** (an admin closing dates). A Block has no guest and no revenue and is never a [[booking]] — iCal feeds from Airbnb/Booking carry no guest or price data, so an imported hold cannot be promoted to a Booking. (See ADR on channel integration.)
_Avoid_: réservation, blocage (in code)

**Availability**:
The derived answer to "can this room be reserved for `[checkIn, checkOut)`?" — the *complement* of the room's [[hold|Holds]] over that window. Not stored; always computed. The public iCal export must mirror this exact set so DirectLoc acts as the cross-channel sync hub (ADR-0004).
_Avoid_: disponibilité (in code)

**Hold**:
A span `[start, end)` for which a room is unavailable, *whatever the cause* — a [[booking|Booking]] (pending or confirmed), an **iCal Block**, or a **manual Block**. The unifying concept above [[booking]] and [[block]]: it carries no guest, price, or status of its own, only an occupied interval. [[availability|Availability]] is its complement. The availability module enumerates a room's Holds over a window once (collapsing the overlap predicate `start < windowEnd && end > windowStart` previously hand-written across each source) and the date-picker, the `isRoomAvailable` check, the room-list filter, and the iCal export all read that single set.
_Avoid_: blocage (in code — reserved for the manual [[block]]), réservation

**Source**:
Where a booking originated: `direct` (guest booked on the tenant's own site) or `manual` (an admin entered it). Reserved for future channel values (`airbnb`, `booking`) once a Channel Manager integration exists. A `manual` booking may be *admitted over an existing [[hold|Hold]]* — a deliberate admin override (the « Forcer » flag), e.g. recording a reservation already honored off-platform. A `direct` booking never may: the public engine always rejects overlap. Both pass the same admission gate (`admitBooking`, ADR-0008); they differ only in whether overlap and booking-rules are enforced.

**Booking status** — the *lifecycle & inventory* axis (`bookings.status`). Orthogonal to [[payment-status]]; says nothing about money. (See ADR-0003.)
- `pending` — created, room held, not yet committed (a direct booking awaiting payment).
- `confirmed` — **committed: the room is held and the reservation will be honored.** Not a statement about payment. A direct booking becomes confirmed *because* its payment succeeded; a manual booking is created confirmed and may be paid later (on arrival).
- `completed` — the stay is over (`checkOut` has passed). Terminal.
- `cancelled` — released; the room is freed. Terminal (a guest who wants to return makes a new booking).

Legal transitions (enforced): `pending → confirmed | cancelled`, `confirmed → completed | cancelled`. `completed` and `cancelled` are terminal. Any other jump is rejected.
_Avoid_: "confirmed = paid" (false — that conflates the two axes)

**Payment status** — the *money* axis (`payments.status`: `pending | paid | failed | refunded`). The only source of truth for "has the guest paid?" Never inferred from [[booking-status]].

**Night**:
The unit a booking is sold in — a *calendar date*, not an instant. Represented as UTC midnight and always compared date-only (`getUTC*`); it never carries a meaningful local time. Assumes metropolitan France and a UTC deployment (ADR-0005). The number of nights in a booking is the count of dates in `[checkIn, checkOut)`.
_Avoid_: nuitée (in code)

### Tarification

**Base price**:
A room's default per-night price (`rooms.pricePerNight`). The price for a night when no [[pricing-rule]] applies; not a floor — a rule may go below it.

**Pricing rule**:
A conditional override of the [[base-price|base price]] for a [[night]] (fixed price or percentage modifier), scoped to a room or global, optionally restricted by date window and days of week. May *raise* (seasonal/weekend surge) or *lower* (**promo**) the price. When several match a night, resolution is by precedence — highest `priority`, then specificity (room > global, day-restricted > all-days, narrower window > all-year), then recency (ADR-0006).
_Avoid_: "highest price wins" (the rejected old model)
