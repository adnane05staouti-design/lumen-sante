CREATE TYPE "public"."role" AS ENUM('ADMIN', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');--> statement-breakpoint
CREATE TABLE "absences" (
	"id" text PRIMARY KEY NOT NULL,
	"doctor_id" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"reason" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"doctor_id" text NOT NULL,
	"specialty_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "appointment_status" DEFAULT 'PENDING' NOT NULL,
	"patient_name" text NOT NULL,
	"patient_phone" text NOT NULL,
	"patient_email" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"locale" text DEFAULT 'fr' NOT NULL,
	"cancel_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_reference_unique" UNIQUE("reference"),
	CONSTRAINT "appointments_cancel_token_unique" UNIQUE("cancel_token")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"title" text DEFAULT 'Dr' NOT NULL,
	"bio_fr" text DEFAULT '' NOT NULL,
	"bio_en" text DEFAULT '' NOT NULL,
	"bio_ar" text DEFAULT '' NOT NULL,
	"languages" text DEFAULT 'fr,ar' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"specialty_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"doctor_id" text NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"auto_confirm" boolean DEFAULT true NOT NULL,
	"min_lead_hours" integer DEFAULT 2 NOT NULL,
	"max_days_ahead" integer DEFAULT 60 NOT NULL,
	"cancel_limit_hours" integer DEFAULT 24 NOT NULL,
	"max_active_per_email" integer DEFAULT 3 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specialties" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"duration_min" integer DEFAULT 30 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "specialties_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'STAFF' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "absences" ADD CONSTRAINT "absences_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "absences_doctor_idx" ON "absences" USING btree ("doctor_id","starts_on","ends_on");--> statement-breakpoint
CREATE INDEX "appointments_doctor_start_idx" ON "appointments" USING btree ("doctor_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_start_idx" ON "appointments" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "doctors_specialty_idx" ON "doctors" USING btree ("specialty_id");--> statement-breakpoint
CREATE INDEX "schedules_doctor_weekday_idx" ON "schedules" USING btree ("doctor_id","weekday");