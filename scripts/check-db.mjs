/**
 * Read-only check of a database: lists the tables and the number of applied migrations.
 * Usage: node scripts/check-db.mjs   (uses DATABASE_URL from the environment or from .env)
 */
import pg from "pg";

try {
  process.loadEnvFile(".env"); // variables already set in the terminal take precedence
} catch {}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  const host = new URL(url).hostname; // never print the password
  const tables = await client.query("select tablename from pg_tables where schemaname = 'public' order by 1");
  const migrations = await client.query("select count(*)::int as n from drizzle.__drizzle_migrations");
  console.log(`Base : ${host}`);
  console.log(`${tables.rows.length} tables : ${tables.rows.map((r) => r.tablename).join(", ")}`);
  console.log(`${migrations.rows[0].n} migrations appliquées`);
} catch (error) {
  console.error("Erreur :", error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}