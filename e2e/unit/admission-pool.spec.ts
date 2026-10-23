import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { deleteBookingsByEmail } from "../helpers/intake";

/**
 * Régression `.scratch/audit-2026-10/issues/01` : 12 admissions simultanées
 * sur les mêmes nuits ne doivent pas épuiser le pool pg (10 connexions) et geler
 * le site. Toutes les requêtes de `admitBooking` passent par sa transaction.
 *
 * Sous-processus (cf. date-windows.spec) : la sonde importe `lib/` directement,
 * ce qui garantit une vraie simultanéité — via le navigateur, les soumissions
 * arrivent trop étalées pour remplir le pool.
 */

const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as { tenantId: string; apiRoomId: string };

test("12 admissions simultanées : une seule résa, 11 conflits, le pool reste utilisable", async () => {
  const email = `flood-${Date.now().toString(36)}@example.com`;
  try {
    const out = execFileSync(
      "npx",
      ["tsx", path.join(__dirname, "admission-pool-probe.ts"), ctx.tenantId, ctx.apiRoomId, email],
      { encoding: "utf8", timeout: 30_000 },
    );
    expect(JSON.parse(out.trim().split("\n").pop()!)).toEqual({
      finished: true,
      created: 1,
      conflicts: 11,
      poolOk: true,
    });
  } finally {
    await deleteBookingsByEmail(ctx.tenantId, email);
  }
});
