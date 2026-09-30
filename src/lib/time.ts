import { clinic } from "@/config/clinic";

const TZ = clinic.timezone;

/** Offset (minutes) of the clinic time zone at a given instant. */
function offsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** "2026-10-02" + "09:30" in clinic time → exact UTC instant. */
export function clinicTimeToUtc(day: string, time: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const first = new Date(guess.getTime() - offsetMinutes(guess) * 60000);
  // second pass handles days where the offset changes
  return new Date(guess.getTime() - offsetMinutes(first) * 60000);
}

/** Clinic-local calendar day ("YYYY-MM-DD") of an instant. */
export function clinicDay(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** Clinic-local "HH:MM" of an instant. */
export function clinicTime(at: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);
}

/** Weekday (0 = Sunday) of a "YYYY-MM-DD" calendar day. */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const fromMinutes = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

const localeTag = { fr: "fr-FR", en: "en-GB", ar: "ar-MA" } as const;

/** Long, human date in the clinic time zone, e.g. "jeudi 2 octobre 2026 à 09:30". */
export function formatLong(at: Date, locale: "fr" | "en" | "ar"): string {
  return new Intl.DateTimeFormat(localeTag[locale], {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

/** "2026-02-30" is refused (JavaScript would silently turn it into 2 March). */
export function isValidDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day;
}

/** Current time for server components (each request renders once: this is the request time). */
export const requestTime = () => Date.now();
