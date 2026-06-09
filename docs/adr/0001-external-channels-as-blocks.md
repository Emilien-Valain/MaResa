# External-channel availability is imported as opaque Blocks, not Bookings

Airbnb and Booking.com expose availability only via privacy-stripped iCal feeds (UID + dates + an opaque summary — no guest, no email, no price); their richer reservation APIs are gated behind qualifying partner programs.

We therefore model imported external holds as **iCal Blocks** (no guest, no revenue), strictly distinct from **Bookings**. A Block can never be promoted to a Booking, because the source data to make it one does not exist.

Promoting a channel from opaque Block to real Booking (`source: "airbnb"` / `"booking"`, with guest details) is deferred until a Channel Manager integration is in place — either an official partner API or an intermediary (Beds24, Smoobu, Hostaway). Until then, "why don't imported Airbnb stays show guest details?" has a one-word answer: iCal.
