ALTER TABLE "users" ADD COLUMN "totp_secret" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "totp_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "totp_last_step" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "recovery_codes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
-- Cancellation links: keep only the SHA-256 fingerprint of the tokens already e-mailed (the links keep working)
UPDATE "appointments" SET "cancel_token" = encode(sha256(convert_to("cancel_token", 'UTF8')), 'hex') WHERE "cancel_token" !~ '^[0-9a-f]{64}$';
