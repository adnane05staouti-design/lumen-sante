/**
 * Lumen Santé — data model (PostgreSQL, Drizzle ORM).
 * Every query goes through Drizzle, which always sends parameterised SQL (no SQL injection).
 */
import { relations } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const roleEnum = pgEnum("role", ["ADMIN", "STAFF"]);
export const statusEnum = pgEnum("appointment_status", ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]);

/** Back-office accounts. Passwords are stored as bcrypt hashes only. */
export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("STAFF"),
  active: boolean("active").notNull().default(true),
  /** incremented on logout / password change / deactivation: every older session becomes invalid */
  sessionVersion: integer("session_version").notNull().default(0),
  /** two-factor authentication: TOTP secret encrypted with AES-256-GCM (null = not set up) */
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  /** last accepted 30-second window: the same code can never be used twice */
  totpLastStep: integer("totp_last_step").notNull().default(0),
  /** SHA-256 of the unused recovery codes */
  recoveryCodes: jsonb("recovery_codes").$type<string[]>().notNull().default([]),
  createdAt: createdAt(),
});

/** Specialties enabled for this clinic. `slug` matches the ids in src/config/clinic.ts. */
export const specialties = pgTable("specialties", {
  id: id(),
  slug: text("slug").notNull().unique(),
  durationMin: integer("duration_min").notNull().default(30),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const doctors = pgTable(
  "doctors",
  {
    id: id(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    title: text("title").notNull().default("Dr"),
    bioFr: text("bio_fr").notNull().default(""),
    bioEn: text("bio_en").notNull().default(""),
    bioAr: text("bio_ar").notNull().default(""),
    languages: text("languages").notNull().default("fr,ar"),
    active: boolean("active").notNull().default(true),
    specialtyId: text("specialty_id")
      .notNull()
      .references(() => specialties.id),
    createdAt: createdAt(),
  },
  (t) => [index("doctors_specialty_idx").on(t.specialtyId)],
);

/** Weekly working hours. weekday: 0 = Sunday … 6 = Saturday. Times "HH:MM", clinic local time. */
export const schedules = pgTable(
  "schedules",
  {
    id: id(),
    doctorId: text("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
  },
  (t) => [index("schedules_doctor_weekday_idx").on(t.doctorId, t.weekday)],
);

/** Days off (holidays, conferences…). Inclusive dates. */
export const absences = pgTable(
  "absences",
  {
    id: id(),
    doctorId: text("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    reason: text("reason").notNull().default(""),
  },
  (t) => [index("absences_doctor_idx").on(t.doctorId, t.startsOn, t.endsOn)],
);

export const appointments = pgTable(
  "appointments",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    doctorId: text("doctor_id")
      .notNull()
      .references(() => doctors.id),
    specialtyId: text("specialty_id")
      .notNull()
      .references(() => specialties.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: statusEnum("status").notNull().default("PENDING"),
    patientName: text("patient_name").notNull(),
    patientPhone: text("patient_phone").notNull(),
    patientEmail: text("patient_email").notNull(),
    reason: text("reason").notNull().default(""),
    locale: text("locale").notNull().default("fr"),
    /** SHA-256 of the cancellation token sent by e-mail (the token itself is never stored) */
    cancelToken: text("cancel_token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("appointments_doctor_start_idx").on(t.doctorId, t.startsAt),
    index("appointments_start_idx").on(t.startsAt),
    index("appointments_email_idx").on(t.patientEmail, t.startsAt),
  ],
);

/**
 * Guarantees a doctor can never be double-booked, even with two simultaneous requests:
 * only one *active* appointment may exist per doctor and start time.
 * (Partial unique index, created in the migration — see drizzle/0001_no_double_booking.sql)
 */
export const NO_DOUBLE_BOOKING_INDEX = "appointments_no_double_booking";

/** Singleton row (id = 1): booking rules the clinic can change from the admin. */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  autoConfirm: boolean("auto_confirm").notNull().default(true),
  minLeadHours: integer("min_lead_hours").notNull().default(2),
  maxDaysAhead: integer("max_days_ahead").notNull().default(60),
  cancelLimitHours: integer("cancel_limit_hours").notNull().default(24),
  maxActivePerEmail: integer("max_active_per_email").notNull().default(3),
});

/** Fixed-window rate limiting shared by every server instance (safe on serverless hosting). */
/**
 * Editable site content (texts, identity, gallery…) managed from /admin/contenu.
 * One row per block; the code keeps default values, the database only stores what the clinic changed.
 */
export const siteContent = pgTable("site_content", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/** Uploaded images (logo, gallery). Stored in PostgreSQL: no extra service, backed up with the data. */
export const media = pgTable("media", {
  id: id(),
  mime: text("mime").notNull(),
  data: bytea("data").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  bytes: integer("bytes").notNull(),
  createdAt: createdAt(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
}, (t) => [index("rate_limits_reset_idx").on(t.resetAt)]);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    detail: text("detail").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

export const specialtiesRelations = relations(specialties, ({ many }) => ({ doctors: many(doctors) }));
export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  specialty: one(specialties, { fields: [doctors.specialtyId], references: [specialties.id] }),
  schedules: many(schedules),
  absences: many(absences),
  appointments: many(appointments),
}));
export const schedulesRelations = relations(schedules, ({ one }) => ({
  doctor: one(doctors, { fields: [schedules.doctorId], references: [doctors.id] }),
}));
export const absencesRelations = relations(absences, ({ one }) => ({
  doctor: one(doctors, { fields: [absences.doctorId], references: [doctors.id] }),
}));
export const appointmentsRelations = relations(appointments, ({ one }) => ({
  doctor: one(doctors, { fields: [appointments.doctorId], references: [doctors.id] }),
  specialty: one(specialties, { fields: [appointments.specialtyId], references: [specialties.id] }),
}));
export const auditRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));
