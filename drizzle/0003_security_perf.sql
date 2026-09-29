DROP INDEX "appointments_status_idx";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "appointments_email_idx" ON "appointments" USING btree ("patient_email","starts_at");--> statement-breakpoint
CREATE INDEX "rate_limits_reset_idx" ON "rate_limits" USING btree ("reset_at");--> statement-breakpoint
-- No overlapping active appointments for the same doctor, even with different start times (race-proof).
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist ("doctor_id" WITH =, tstzrange("starts_at", "ends_at") WITH &&)
  WHERE ("status" IN ('PENDING', 'CONFIRMED'));
