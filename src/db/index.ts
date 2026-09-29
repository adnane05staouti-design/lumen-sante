import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * One small connection pool per server instance.
 * In production use Neon's POOLED connection string (host "…-pooler…"): PgBouncer accepts thousands of
 * clients, so many serverless instances never exhaust the database. TLS certificates are always verified.
 */
const globalForDb = globalThis as unknown as { pool?: Pool };
const url = process.env.DATABASE_URL ?? "";
const needsTls = /sslmode=(require|verify-full|verify-ca)/.test(url) || url.includes("neon.tech");

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: url,
    max: Number(process.env.DB_POOL_MAX ?? 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    ssl: needsTls ? { rejectUnauthorized: true } : undefined,
  });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export { schema };
