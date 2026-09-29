import { sql } from "drizzle-orm";
import { db } from "@/db";
import { safeError } from "@/lib/log";

export const dynamic = "force-dynamic";

/** Uptime check (UptimeRobot, Better Stack…): 200 when the site and the database answer, 503 otherwise. No details exposed. */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok" }, { headers });
  } catch (error) {
    console.error("[health] database unreachable:", safeError(error));
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
