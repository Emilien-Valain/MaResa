# Booking status and payment status are orthogonal; the booking lifecycle is an enforced state machine

A booking carries two independent facts that earlier docs conflated:

- **Booking status** (`bookings.status`) — the lifecycle and inventory: is the room held (`pending`), committed/honored (`confirmed`), over (`completed`), or released (`cancelled`)?
- **Payment status** (`payments.status`) — the money: `pending | paid | failed | refunded`.

`confirmed` means **committed — the room is held and the reservation will be honored**, *not* "paid." The two coincide for direct online bookings only because a successful Stripe payment is what *triggers* `pending → confirmed`. Manual (admin-entered) bookings are created `confirmed` with no payment and may be paid on arrival (cash, chèque-vacances, etc.). "Has the guest paid?" is always read from `payments`, never inferred from `bookings.status`.

`completed` means the stay is over — `checkOut` has passed. Today it is set by a manual admin action; auto-completing it via the existing daily cron (`/api/cron/booking-emails`, which already walks past-checkout bookings) is a deferred, backward-compatible enhancement.

The lifecycle is an **enforced state machine**. Legal transitions: `pending → confirmed | cancelled`, `confirmed → completed | cancelled`; `cancelled` and `completed` are terminal. `updateStatus` must reject any other transition. This deliberately closes off today's behaviour, where `updateStatus` writes any status unconditionally — which allowed silently resurrecting a cancelled (possibly refunded) booking back to `confirmed`, re-blocking inventory with no money behind it.
