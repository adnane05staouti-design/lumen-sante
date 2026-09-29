import "server-only";
import { lt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db, schema } from "@/db";

/**
 * Fixed-window rate limit stored in PostgreSQL, so it works across all serverless instances.
 * Returns true when the caller is over the limit. Expired rows are purged from time to time.
 */
export async function isRateLimited(key: string, limit: number, windowSec: number): Promise<boolean> {
  const safeKey = key.slice(0, 200);
  const resetAt = new Date(Date.now() + windowSec * 1000);
  const [row] = await db
    .insert(schema.rateLimits)
    .values({ key: safeKey, count: 1, resetAt })
    .onConflictDoUpdate({
      target: schema.rateLimits.key,
      set: {
        count: sql`CASE WHEN ${schema.rateLimits.resetAt} < now() THEN 1 ELSE ${schema.rateLimits.count} + 1 END`,
        resetAt: sql`CASE WHEN ${schema.rateLimits.resetAt} < now() THEN ${resetAt.toISOString()}::timestamptz ELSE ${schema.rateLimits.resetAt} END`,
      },
    })
    .returning({ count: schema.rateLimits.count });
  // housekeeping on ~1 call in 100: the table never grows forever
  if (Math.random() < 0.01) {
    db.delete(schema.rateLimits)
      .where(lt(schema.rateLimits.resetAt, new Date(Date.now() - 3600_000)))
      .catch(() => {});
  }
  return row.count > limit;
}

/**
 * Client IP. On Vercel, x-real-ip / x-forwarded-for are set by the platform (a visitor cannot forge them).
 * Behind another host, make sure the reverse proxy overwrites these headers.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "unknown").trim().slice(0, 64);
}

/** Rate-limit key for the client's network: the full IPv4 address, or the /64 prefix of an IPv6 address
 *  (one IPv6 user owns a whole /64 and could otherwise rotate addresses to bypass the limits). */
export async function clientKey(): Promise<string> {
  const ip = await clientIp();
  if (!ip.includes(":")) return ip;
  const parts = ip.split("::")[0].split(":");
  return `${parts.slice(0, 4).join(":")}::/64`;
}
