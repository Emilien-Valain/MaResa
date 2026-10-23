import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { icalSourceSchema } from "../../lib/validation";
import { isPrivateAddress } from "../../lib/ical-sync";

/**
 * Régression `.scratch/audit-2026-10/issues/08` : la sync iCal ne doit jamais
 * appeler le réseau interne (SSRF), même si le texte de l'URL a l'air public
 * (DNS vers 127.x / 10.x, IPv4-mappée). Les redirections sont suivies (≤ 3) avec
 * re-contrôle de l'hôte à chaque saut.
 */

const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as { rivalTenantId: string; rivalRoomId: string };

test("sync iCal : hôte interne refusé, redirections suivies (≤ 3) avec re-contrôle à chaque saut", async () => {
  const out = execFileSync(
    "npx",
    ["tsx", path.join(__dirname, "ical-ssrf-probe.ts"), ctx.rivalTenantId, ctx.rivalRoomId],
    { encoding: "utf8", timeout: 60_000 },
  );
  expect(JSON.parse(out.trim().split("\n").pop()!)).toEqual({
    localhost: { blocks: 0 },
    mapped: { blocks: 0 },
    allowed: { blocks: 1 },
    redirect: { blocks: 1 },
    threeHops: { blocks: 1 },
    fourHops: { blocks: 0 },
    redirectToInternal: { blocks: 0 },
    internalIp: { blocks: 0 },
  });
});

test("adresses internes reconnues (IPv4, IPv6, mappées), adresses publiques acceptées", () => {
  for (const ip of ["169.254.169.254", "127.0.0.1", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1", "0.0.0.0", "100.64.0.1"])
    expect(isPrivateAddress(ip, 4), ip).toBe(true);
  for (const ip of ["::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:a9fe:a9fe"])
    expect(isPrivateAddress(ip, 6), ip).toBe(true);
  for (const ip of ["93.184.216.34", "172.32.0.1", "8.8.8.8"]) expect(isPrivateAddress(ip, 4), ip).toBe(false);
  expect(isPrivateAddress("2606:4700::1111", 6)).toBe(false);
});

test("formulaire : l'URL des métadonnées cloud est refusée d'emblée", () => {
  const base = { roomId: ctx.rivalRoomId, name: "x" };
  const r = icalSourceSchema.safeParse({ ...base, url: "http://169.254.169.254/latest/meta-data/" });
  expect(r.success).toBe(false);
  expect(icalSourceSchema.safeParse({ ...base, url: "https://www.airbnb.fr/calendar/ical/1.ics" }).success).toBe(true);
});
