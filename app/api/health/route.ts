import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * GET /api/health
 *
 * Health check pour Coolify / load balancer.
 * Vérifie que l'app répond et que la DB est joignable.
 */
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch {
    return NextResponse.json(
      { status: "error", detail: "database unreachable" },
      { status: 503 },
    );
  }
}
