# Each hotel is a Tenant; one operator managing several hotels is several Tenants

A hotel is a **Tenant**: its own domain, theme, public site, and isolated data. An operator who runs several hotels (or an admin who manages several) does so as **several Tenants linked to one User** via `user_tenants`, switching between them with the tenant switcher. This is the implemented, supported model.

We explicitly do **not** support multiple physical locations under a *single* tenant/site (one domain, a location picker). Routing, theming, availability, and the public UX are all tenant-scoped; there is no property dimension in the product.

Consequence: the `properties` table is dormant — exactly one property is auto-created per tenant and every room attaches to it. It is retained as a latent 1:1 internal detail, not a domain concept. Do not build product features on it; if multi-location-per-site is ever needed, it is a deliberate, separately-designed feature (property-scoped routing/theming/availability), not an incremental use of the existing column.
