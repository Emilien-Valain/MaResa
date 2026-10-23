# Delete unused shadcn Button, helpers and 7 dependencies

Status: resolved — deleted shadcn Button, cn(), isDateInBooking and 7 unused packages
Group: Should fix (lean)

## Problem

No imports anywhere in `app/`, `components/`, `lib/`, `e2e/`, `scripts/`:
- `components/ui/button.tsx` (shadcn Button) and `cn()` in `lib/utils.ts` (used only by that button)
- `isDateInBooking` in `lib/calendar.ts`

Dependencies used only by the dead code, or by nothing:
- `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge` (button only)
- `lucide-react`, `node-cron`, `@types/node-cron` (never imported)

Keep `shadcn`: `app/globals.css:3` imports `shadcn/tailwind.css`.

## Fix

1. Re-grep each name (including string/dynamic references and `components.json`) to confirm.
2. Delete the button file, `cn` (and its imports in `lib/utils.ts`), `isDateInBooking`.
3. `npm uninstall @base-ui/react class-variance-authority clsx tailwind-merge lucide-react node-cron @types/node-cron`.
4. If `components.json` aliases point at `components/ui`, leave it (harmless config for the shadcn CLI) unless empty dirs break something.

## Acceptance

- `npm run build`, `npm run lint`, `npm test` pass.
- Obsidian `Stack technique.md` no longer lists removed packages.

## Comments

### 2026-10-23 — resolved
- Re-grepped (git grep, whole repo incl. components.json, next/postcss/tsconfig, CSS @import/@plugin, Dockerfile, scripts, e2e): no usage outside the dead code itself. `shadcn/tailwind.css` imports none of the removed packages.
- Removed files/code: `components/ui/button.tsx` (and now-empty `components/ui/`), `cn()` + its `clsx`/`tailwind-merge` imports in `lib/utils.ts` (`formatEuros` kept), `isDateInBooking` in `lib/calendar.ts`.
- `npm uninstall`: `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `node-cron`, `@types/node-cron` (package.json + package-lock.json).
- Kept: `shadcn` (globals.css imports `shadcn/tailwind.css`), `tw-animate-css` (imported in globals.css), `components.json` (CLI config, harmless; its `ui` alias points at a now-missing dir that the CLI recreates on demand).
- Checks: `tsc --noEmit` OK, `next build` OK, Playwright 299 passed / 3 skipped / 0 failed. `npm run lint` reports 2 pre-existing errors (login/page.tsx unescaped `'`, BookingForm.tsx setState-in-effect) in files this issue did not touch — not fixed here.
- No new tests: pure dead-code removal, behaviour unchanged.
- Obsidian: `Stack technique.md` cron section rewritten (node-cron was documented but never used; real mechanism = `/api/cron/*` endpoints + `CRON_SECRET` + external cron); `iCal Sync.md` code sample no longer imports node-cron.
