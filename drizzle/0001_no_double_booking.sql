-- A doctor can never have two active appointments starting at the same time.
-- Enforced by the database itself, so it holds even under concurrent requests.
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_no_double_booking"
  ON "appointments" ("doctor_id", "starts_at")
  WHERE "status" IN ('PENDING', 'CONFIRMED');
--> statement-breakpoint
INSERT INTO "settings" ("id") VALUES (1) ON CONFLICT DO NOTHING;
