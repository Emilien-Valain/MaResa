---
name: DirectLoc
description: White-label direct-booking platform for small independent hosts — admin back-office plus per-tenant guest sites.
colors:
  forest-night: "#1C3A2C"
  forest: "#2A5C40"
  forest-mist: "#EAF2ED"
  terracotta: "#D4784A"
  terracotta-blush: "#FDF0E8"
  linen: "#F8F6F3"
  paper: "#FFFFFF"
  oat: "#F3EFE9"
  ink: "#1C1917"
  stone: "#6B645F"
  pebble: "#736C66"
  sand-line: "#E7E2DA"
  sand-line-light: "#F0EDE7"
  status-confirmed-bg: "#DCFCE7"
  status-confirmed: "#15803D"
  status-confirmed-bar: "#16A34A"
  status-pending-bg: "#FEF9C3"
  status-pending: "#A16207"
  status-pending-bar: "#D97706"
  status-completed-bg: "#F1F5F9"
  status-completed: "#475569"
  status-completed-bar: "#94A3B8"
  status-cancelled-bg: "#FEE2E2"
  status-cancelled: "#B91C1C"
  status-cancelled-bar: "#DC2626"
  danger: "#B91C1C"
  danger-hover: "#991B1B"
  danger-line: "#FCA5A5"
  terracotta-text: "#A9532A"
  channel-booking: "#003580"
  channel-booking-bg: "#E8F0FA"
  channel-airbnb: "#BF3036"
  channel-airbnb-bg: "#FFE8E9"
  banner-success-line: "#86EFAC"
  banner-warning: "#92400E"
  banner-warning-bg: "#FEF3C7"
  banner-warning-line: "#FCD34D"
  banner-error: "#991B1B"
  blocked-hatch: "#CBD5E1"
  blocked-hatch-light: "#E2E8F0"
  blocked-bg: "#F8FAFC"
  stripe: "#635BFF"
  stripe-hover: "#4D43E8"
typography:
  page-title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.6px"
  kpi-value:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-1px"
  section-title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 800
    letterSpacing: "-0.3px"
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 500
  caption:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  field: "8px"
  button: "10px"
  card: "12px"
  dialog: "16px"
  pill: "9999px"
spacing:
  field-y: "9px"
  field-x: "12px"
  section-x: "22px"
  page-x-mobile: "20px"
  page-x: "32px"
  page-y: "28px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.paper}"
    rounded: "{rounded.button}"
    padding: "10px 18px"
    typography: "{typography.body}"
  button-ghost:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.stone}"
    rounded: "{rounded.field}"
    padding: "7px 14px"
  button-ghost-active:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.paper}"
    rounded: "{rounded.field}"
    padding: "7px 14px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "9px 12px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
  sidebar:
    backgroundColor: "{colors.forest-night}"
    textColor: "{colors.paper}"
    width: "240px"
  status-badge-confirmed:
    backgroundColor: "{colors.status-confirmed-bg}"
    textColor: "{colors.status-confirmed}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  status-badge-pending:
    backgroundColor: "{colors.status-pending-bg}"
    textColor: "{colors.status-pending}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
---

# Design System: DirectLoc

## Overview

**Creative North Star: "The Quiet Concierge"**

The admin is a concierge who is always ready and never in the way. The host comes in to check today's arrivals, record a phone booking, or close a weekend. The interface answers quickly, in plain French, and then gets out of the way. Expression lives in the details: a deep forest sidebar, a terracotta mark, warm linen behind white cards. The layout itself stays predictable.

The surface is warm and tactile, never clinical. Backgrounds are linen and oat rather than grey. Borders are sand-coloured. Controls have soft 8–12px corners, a 1.5px field stroke and a gentle shadow you can almost feel. Density is moderate: one screen shows a working day's worth of information without crowding. Text sizes are compact (13.5px body) because hosts scan, not read.

Guest-facing sites are a different world on purpose. Each one belongs to the host (see *Public templates* under Components). The admin palette never leaks into them, and template palettes never leak into the admin.

**Key Characteristics:**
- Forest-green structure, terracotta as the rare warm accent.
- Warm neutrals (linen, oat, sand), never cool grey for surfaces.
- One sans family (Plus Jakarta Sans) carrying hierarchy through weight and tight tracking.
- Soft corners, light lift, flat at rest.
- Status colours are semantic and fixed; they mean the same thing on every screen.

## Colors

A forest-and-terracotta palette on warm linen: grounded, rural and calm.

### Primary
- **Forest** (#2A5C40): primary buttons, active tabs, focus borders, toggles, KPI accent values, the "Site direct" channel tag. The colour of action and of "this is yours".
- **Forest Night** (#1C3A2C): the sidebar background only. It frames the workspace and is never used for content surfaces.
- **Forest Mist** (#EAF2ED): tint behind primary-coloured text (info banners, guest avatars, direct-channel tag).

### Secondary
- **Terracotta** (#D4784A): the brand mark tile, the active nav indicator bar, and the hotel icon in the switcher. Accent only.
- **Terracotta Blush** (#FDF0E8): light tint paired with terracotta.
- **Terracotta Text** (#A9532A): terracotta for text on blush (departure tags, avatars), 4.7:1. Raw terracotta on blush is only 2.9:1.

### Neutral
- **Linen** (#F8F6F3): the app background behind all content.
- **Paper** (#FFFFFF): cards, sections and inputs.
- **Oat** (#F3EFE9): secondary surfaces such as weekend columns in the calendar and the end stop of the auth background gradient.
- **Ink** (#1C1917): primary text.
- **Stone** (#6B645F): secondary text, labels, inactive tabs.
- **Pebble** (#736C66): hints and tertiary text. Darkened from #A8A29E (2.5:1) so hints pass 4.5:1 on every surface; hierarchy comes from size and weight, not from fading the grey.
- **Sand Line** (#E7E2DA) / **Sand Line Light** (#F0EDE7): borders and dividers.

### Status, danger and channel colours
One status palette everywhere a booking state appears (badge, calendar bar, calendar label, booking detail). Each status has three values: a tint background, a text colour that passes 4.5:1 on that tint, and a stronger "bar" colour for dots and calendar bars (non-text, 3:1).

| Status | Background | Text | Bar |
|---|---|---|---|
| Confirmée | #DCFCE7 | #15803D | #16A34A |
| En attente | #FEF9C3 | #A16207 | #D97706 |
| Terminée | #F1F5F9 | #475569 | #94A3B8 |
| Annulée | #FEE2E2 | #B91C1C | #DC2626 |

- **Danger** (#B91C1C, token `--admin-danger`): delete and cancel actions, field errors, the danger button fill (hover #991B1B), and the cancelled status text. Outline variant uses the #FCA5A5 line. It is the only red used for text; #DC2626 survives only as a status bar.
- **Positive** values (a "+10 %" price rule) use the confirmed text green #15803D, never #16A34A (3.3:1 on white).
- **Channels** keep a recognisable brand colour, darkened where needed for text: Booking.com navy #003580 on #E8F0FA, Airbnb #BF3036 on #FFE8E9 (Airbnb's own #FF5A5F is only 2.6:1). Manual and iCal bookings use the completed slate.
- **Banners** (`StatusBanner`): success uses the confirmed tint with a #86EFAC line; warning #92400E on #FEF3C7 with a #FCD34D line; error #991B1B on the cancelled tint with the #FCA5A5 line.
- **Blocked dates** in the calendar: slate hatching (#CBD5E1 / #E2E8F0 on #F8FAFC), deliberately colourless so blocks never read as a booking status.
- **Stripe** (#635BFF, hover #4D43E8): only on the « Connecter Stripe » button, so the host recognises the service they are handing their payments to.

### Named Rules
**The Terracotta Whisper Rule.** Terracotta marks identity and "you are here" — the logo tile, the active nav bar. It is never a button fill or a large surface.

**The Two Palettes Rule.** `--admin-*` tokens live under `[data-admin]` and are used only in `/admin` and auth screens. The legacy `warm-*` / `amber-accent` scale belongs to the public templates. Never mix them.

## Typography

**Display Font:** none; the admin uses a single family.
**Body Font:** Plus Jakarta Sans (fallback system-ui, sans-serif), loaded via `next/font` as `--font-jakarta`.

**Character:** a friendly geometric sans with enough weight range (400–800) to build hierarchy without a second family. Heavy weights with negative tracking give titles a confident, compact voice.

### Hierarchy
- **Page title** (800, 24px, tracking -0.6px): one per page, in `PageHeader`.
- **KPI value** (800, 28px, line-height 1, tracking -1px): dashboard figures.
- **Section title** (800, 15px, tracking -0.3px): settings sections and card headers.
- **Body** (500–600, 13.5px): nav items, buttons, field values, tabs.
- **Caption** (400, 12.5px, line-height 1.5): subtitles, descriptions, banners.
- **Label** (700, 12px, uppercase, tracking 0.06em; nothing in the admin goes below 12px): form field labels and KPI titles (12px, 600).

### Named Rules
**The Weight-Not-Size Rule.** Hierarchy comes from weight and tracking at compact sizes. Nothing in the admin goes above 28px.

## Layout

Fixed sidebar on the left (240px, collapsible to 64px, state kept in the `admin-sidebar-collapsed` cookie so the server renders it; a drawer on mobile). The content column is centred with a max width of 1280px and padding of 20px on mobile, 32px from `sm` up, and 28px vertically. Pages stack: `PageHeader` (title + subtitle + one primary action on the right, 28px bottom margin), then cards or settings sections with 20px gaps. KPIs sit in a wrapping flex row (min width 140px each). Settings and rules pages use underline tabs; settings tabs are deep-linkable via `?tab=`.

The calendar is a Gantt-style timeline: rooms as rows with a sticky 160px label column, days as fluid columns, bookings as absolutely positioned spans. Below `md` it falls back to a per-room list.

## Elevation & Depth

Mostly flat, with light lift. Cards carry a barely visible two-layer shadow, so they sit on the linen like paper on a desk. Primary buttons have a slightly stronger drop shadow, which gives them a pressable feel. Only the auth card floats noticeably.

### Shadow Vocabulary
- **Card rest** (`box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`): all `Card` surfaces.
- **Raised** (`box-shadow: 0 4px 12px rgba(0,0,0,0.09), 0 2px 4px rgba(0,0,0,0.05)`): popovers and hover lifts.
- **Pressable** (`box-shadow: 0 2px 8px rgba(0,0,0,0.12)`): the primary button.
- **Floating** (`box-shadow: 0 20px 60px rgba(0,0,0,0.08)`): the auth card only.

### Named Rules
**The Paper-on-Linen Rule.** Depth comes from white paper against warm linen plus a sand border first, and from shadow second. Never stack shadows to create hierarchy.

## Shapes

Soft, consistent corners that step up with the size of the object: fields and ghost buttons 8px, primary buttons and avatars 10px, cards and sections 12px, the auth card 16px. Status badges are full pills; channel tags are 6px. Borders are 1px sand, except fields, which use 1.5px so they read as touchable. The brand mark is a 34px terracotta tile with a 9px radius and a white "D".

## Components

### Buttons
Warm and tactile: they look pressable without shouting.
- **Shape:** gently rounded (10px primary, 8px ghost).
- **Primary:** forest fill, white 13.5px semibold text, 10px × 18px padding, optional 16px leading icon (default "Plus"), Pressable shadow. Disabled at 50% opacity with a not-allowed cursor. Every state-changing action (Confirmer) is a primary button, never a green or blue fill. « Terminée » is set automatically after check-out, so it has no button.
- **Danger:** `--admin-danger` fill for the confirm button inside a destructive dialog; outline (danger text, #FCA5A5 line) for the trigger that opens it.
- **Ghost:** white fill, 1px sand border, stone text at 13px semibold. In the active state it inverts to forest fill with white text. Used for toggles between views and secondary actions.

### Chips
- **Status badge:** a full pill, 12px semibold text, with the fixed status tints described under Colors. French labels: Confirmée, En attente, Terminée, Annulée.
- **Channel tag:** 6px radius, 12px semibold, with a channel-specific tint.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** paper on linen.
- **Shadow Strategy:** card rest (see Elevation & Depth).
- **Border:** 1px sand line.
- **Internal Padding:** 18–22px. Settings sections have a header band (22px × 18px) separated by a sand rule, then a 22px × 20px body.

### Inputs / Fields
- **Style:** white, 1.5px sand stroke, 8px radius, 9px × 12px padding, 13.5px text. Styled only through CSS (`.admin-field`), never with inline handlers.
- **Focus:** the border turns forest; no glow.
- **Field wrapper:** uppercase stone label above, a real `<label for>`; the error is appended inline in danger red ("· message"); the hint sits below in pebble 12px and is announced with the field. Server-side errors come back as a `FormResult` and land on the same field (`aria-invalid`), never as a thrown error that would wipe the input.
- **Dates:** always JJ/MM/AAAA (`DateInput`): a text field that adds the slashes as you type, plus a calendar button that opens the browser's picker. Never a bare `<input type="date">`, whose display follows the browser language (MM/DD/YYYY in English). Dates shown as text use `toLocaleDateString("fr-FR", { timeZone: "UTC" })`.
- **Money:** `formatEuros` — « 272 € », « 272,50 € » only when there are cents. Never `272.00 €`.
- **Empty lists:** `EmptyState` — what will appear here, one concrete example, the first action.
- **Toggle:** a 22px-tall pill track (forest when on, sand when off) with a white knob.

### Navigation
- **Sidebar:** forest night. The brand block is at the top, then the hotel switcher (translucent white pill with a terracotta hotel icon), then the nav list, then the user block. Items are 13.5px; inactive items use white at 55% and brighten on hover. The active item has a white 10% fill, semibold text and a 3px terracotta left bar.
- **Tabs:** an underline row (`role="tablist"`, arrow keys move between tabs); the active tab has a 2px forest underline and forest text. Weight stays 600 on every tab so switching never shifts the row.

### Public templates
Guest sites are owned by the host, not by DirectLoc. Each template sets its own world and receives the tenant's `--color-primary` and `--color-secondary` (plus an optional logo).
- **Classic:** Playfair Display headings, Plus Jakarta Sans body, cream #F8F6F3 base. The header and footer are filled with the tenant's primary colour.
- **Boutique:** Cormorant Garamond headings, Figtree body. The header uses the secondary colour with a centred logo. The primary colour is an accent (links, borders) rather than a fill.
- **Shared:** staged load reveals (`animate-fade-up` + `stagger-1…6`, 50ms steps) that are disabled under `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** scope admin styling under `[data-admin]` and use the `--admin-*` variables, not literal hex values in new components.
- **Do** reuse the shared primitives in `components/admin/ui.tsx` (`Card`, `PageHeader`, `SettingsSection`, `Field`, `PrimaryButton`, `GhostButton`, `StatusBadge`, `Tabs`).
- **Do** keep a single primary action per page header.
- **Do** keep status and channel colours identical on every screen (list, detail, calendar spans).
- **Do** respect `prefers-reduced-motion`; admin motion is limited to the 0.22s `admin-fade-in` page entrance and 0.15s colour transitions.

### Don't:
- **Don't** use terracotta as a button fill or a large background.
- **Don't** bring `warm-*`, `amber-accent` or Cormorant into admin screens, or admin tokens into public templates.
- **Don't** put DirectLoc branding on guest-facing pages beyond a discreet credit.
- **Don't** use cool greys for admin surfaces; neutrals stay warm (linen, oat, sand).
- **Don't** add a second type family to the admin.
