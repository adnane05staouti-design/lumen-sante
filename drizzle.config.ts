import { defineConfig } from "drizzle-kit";

// Loads .env when present (local development). On Vercel the variables come from the dashboard.
try {
  process.loadEnvFile(".env");
} catch {}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations need a direct (non-pooled) connection on Neon: DATABASE_URL_UNPOOLED when it is set.
  dbCredentials: { url: (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)! },
});
