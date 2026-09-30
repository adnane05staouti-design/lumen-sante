"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, CalendarCheck, Check, Loader2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createAppointment, type BookingResult } from "@/app/actions/booking";
import { fetchSlots, fetchWidget } from "@/lib/api-client";
import { clinic, type SpecialtyId } from "@/config/clinic";
import type { Dictionary } from "@/dictionaries";
import type { SpecialtyTexts } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";
import { SpecialtyIcon } from "@/components/ui/SpecialtyIcon";

type DoctorOption = { id: string; name: string; specialty: string };
type Slot = { doctorId: string; time: string; startsAt: string };

type Props = {
  locale: Locale;
  t: Dictionary["book"];
  days: string[]; // "YYYY-MM-DD" in clinic time
  specialties: { slug: SpecialtyId; durationMin: number }[];
  doctors: DoctorOption[];
  initial: { specialty?: string; doctor?: string; day?: string; time?: string };
  specs: SpecialtyTexts;
  privacyLabel: string;
};

const ease = [0.16, 1, 0.3, 1] as const;
const tag = { fr: "fr-FR", en: "en-GB", ar: "ar-MA" } as const;

export function BookingFlow({ locale, t, days, specialties, doctors, initial, specs, privacyLabel }: Props) {
  const validSpecialty = specialties.find((s) => s.slug === initial.specialty)?.slug;
  const [step, setStep] = useState(validSpecialty ? 1 : 0);
  const [specialty, setSpecialty] = useState<SpecialtyId | undefined>(validSpecialty);
  const [doctorId, setDoctorId] = useState<string | undefined>(
    doctors.find((d) => d.id === initial.doctor && d.specialty === validSpecialty)?.id,
  );
  const [day, setDay] = useState(days.includes(initial.day ?? "") ? initial.day! : days[0]);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [taken, setTaken] = useState<string[]>([]); // times already booked: shown greyed out, not clickable
  const [full, setFull] = useState<string[]>([]); // days fully booked (next two weeks)
  const [slot, setSlot] = useState<Slot | null>(null);
  const [loading, startLoading] = useTransition();
  const [sending, startSending] = useTransition();
  const [result, setResult] = useState<BookingResult | null>(null);
  // time chosen in the home widget: pre-selected once, if still free
  const [wantedTime, setWantedTime] = useState(initial.time);

  const specialtyDoctors = useMemo(() => doctors.filter((d) => d.specialty === specialty), [doctors, specialty]);

  useEffect(() => {
    if (!specialty || step !== 1) return;
    let alive = true;
    startLoading(async () => {
      const res = await fetchSlots({ specialty, doctorId, day });
      if (alive) {
        setSlots(res.slots);
        setTaken(res.taken);
        setSlot((wantedTime && res.slots.find((x) => x.time === wantedTime)) || null);
        setWantedTime(undefined);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wantedTime is only read once
  }, [specialty, doctorId, day, step]);

  // fully booked days of the chosen specialty (greyed out in the day picker)
  useEffect(() => {
    if (!specialty) return;
    let alive = true;
    fetchWidget(specialty).then((res) => alive && setFull(res.full ?? []));
    return () => {
      alive = false;
    };
  }, [specialty]);

  /** free times and booked times, in chronological order */
  const times = useMemo(() => {
    if (!slots) return [];
    const freeTimes = new Set(slots.map((s) => s.time));
    return [
      ...slots.map((s) => ({ time: s.time, slot: s as Slot | null })),
      ...taken.filter((time) => !freeTimes.has(time)).map((time) => ({ time, slot: null as Slot | null })),
    ].sort((a, b) => a.time.localeCompare(b.time));
  }, [slots, taken]);

  const dayLabel = (d: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(tag[locale], { ...opts, timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

  function submit(form: FormData) {
    if (!specialty || !slot) return;
    startSending(async () => {
      const res = await createAppointment({
        locale,
        specialty,
        doctorId,
        startsAt: slot.startsAt,
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
        reason: String(form.get("reason") ?? ""),
        consent: form.get("consent") === "on",
        website: String(form.get("website") ?? ""),
      });
      setResult(res);
      if (!res.ok && res.error === "taken") {
        setStep(1);
        setSlots(null);
        setSlot(null);
        startLoading(async () => {
          const res = await fetchSlots({ specialty, doctorId, day });
          setSlots(res.slots);
          setTaken(res.taken);
        });
      }
    });
  }

  if (result?.ok) {
    const confirmed = result.status === "CONFIRMED";
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease }}
        className="glass mx-auto max-w-xl rounded-3xl p-10 text-center"
      >
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent/15 text-accent">
          <Check size={30} />
        </span>
        <h2 className="mt-6 font-display text-3xl font-semibold">{confirmed ? t.successTitle : t.pendingTitle}</h2>
        <p className="mt-3 text-muted">{confirmed ? t.successLead : t.pendingLead}</p>
        <dl className="mt-8 space-y-2 rounded-2xl border border-line p-5 text-start text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t.reference}</dt>
            <dd className="font-display font-semibold" dir="ltr">{result.reference}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t.doctor}</dt>
            <dd>{result.doctor}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t.pickDay}</dt>
            <dd>
              {new Intl.DateTimeFormat(tag[locale], {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: clinic.timezone,
              }).format(new Date(result.startsAt))}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setStep(0);
            setSlot(null);
          }}
          className="mt-8 rounded-xl border border-line px-5 py-3 text-sm hover:bg-surface"
        >
          {t.another}
        </button>
      </motion.div>
    );
  }

  const error = result && !result.ok ? result : null;
  const fieldError = (f: string) => error?.error === "invalid" && error.fields?.includes(f);

  return (
    <div className="mx-auto max-w-4xl">
      {/* progress */}
      <ol className="mb-10 grid grid-cols-3 gap-3">
        {t.steps.map((label, i) => (
          <li key={label} className="flex flex-col gap-2">
            <span className={`h-1 rounded-full transition-colors duration-500 ${i <= step ? "bg-gradient-to-r from-accent to-accent-2" : "bg-line"}`} />
            <span className={`text-xs ${i <= step ? "text-fg" : "text-subtle"}`}>
              0{i + 1} · {label}
            </span>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.ul
            key="s0"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease }}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {specialties.map((s) => (
              <li key={s.slug}>
                <button
                  type="button"
                  onClick={() => {
                    setSpecialty(s.slug);
                    setDoctorId(undefined);
                    setStep(1);
                  }}
                  aria-pressed={specialty === s.slug}
                  className={`group flex w-full items-center gap-4 rounded-2xl border p-5 text-start transition-all hover:-translate-y-0.5 hover:border-line-strong ${
                    specialty === s.slug ? "border-accent bg-accent/5" : "border-line bg-surface"
                  }`}
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-line bg-bg-2 text-accent">
                    <SpecialtyIcon id={s.slug} size={22} strokeWidth={1.6} />
                  </span>
                  <span>
                    <span className="block font-display text-lg font-semibold">{specs[s.slug].name}</span>
                    <span className="text-sm text-muted">{s.durationMin} {t.minutes}</span>
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}

        {step === 1 && specialty && (
          <motion.div
            key="s1"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease }}
            className="glass rounded-3xl p-6 md:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="flex items-center gap-3 font-display text-xl font-semibold">
                <SpecialtyIcon id={specialty} size={22} className="text-accent" />
                {specs[specialty].name}
              </p>
              <label className="flex items-center gap-2 text-sm text-muted">
                <UserRound size={16} />
                <span className="sr-only">{t.doctor}</span>
                <select
                  aria-label={t.doctor}
                  value={doctorId ?? ""}
                  onChange={(e) => setDoctorId(e.target.value || undefined)}
                  className="rounded-lg border border-line bg-bg-2 px-3 py-2 text-fg"
                >
                  <option value="">{t.anyDoctor}</option>
                  {specialtyDoctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="mt-8 text-sm text-muted">{t.pickDay}</p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
              {days.map((d) => {
                const isFull = full.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDay(d)}
                    disabled={isFull}
                    aria-pressed={d === day}
                    aria-label={isFull ? `${dayLabel(d, { weekday: "long", day: "numeric", month: "long" })} — ${t.full}` : undefined}
                    className={`min-w-[68px] rounded-xl border px-3 py-3 text-center transition-all ${
                      isFull
                        ? "cursor-not-allowed border-line/60 text-muted/50"
                        : d === day
                          ? "border-fg bg-fg text-bg"
                          : "border-line text-muted hover:border-line-strong"
                    }`}
                  >
                    <span className="block text-xs opacity-70">{dayLabel(d, { weekday: "short" })}</span>
                    <span className={`block font-display text-lg font-semibold ${isFull ? "line-through" : ""}`}>{dayLabel(d, { day: "numeric" })}</span>
                    <span className="block text-[0.65rem] opacity-60">{isFull ? t.full : dayLabel(d, { month: "short" })}</span>
                  </button>
                );
              })}
            </div>

            <p className="mt-6 text-sm text-muted">{t.pickTime}</p>
            <div className="mt-3 min-h-[120px]" aria-live="polite">
              {loading || slots === null ? (
                <p className="flex items-center gap-2 py-8 text-sm text-muted">
                  <Loader2 size={16} className="animate-spin" /> {t.loading}
                </p>
              ) : slots.length === 0 && times.length === 0 ? (
                <p className="py-8 text-sm text-muted">{t.noSlots}</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                    {times.map(({ time, slot: s }) =>
                      s ? (
                        <button
                          key={s.startsAt + s.doctorId}
                          type="button"
                          onClick={() => setSlot(s)}
                          aria-pressed={slot?.startsAt === s.startsAt}
                          className={`rounded-lg border py-2.5 font-display text-sm transition-all ${
                            slot?.startsAt === s.startsAt ? "border-accent bg-accent/10 text-accent" : "border-line hover:border-line-strong"
                          }`}
                          dir="ltr"
                        >
                          {time}
                        </button>
                      ) : (
                        <button
                          key={`taken-${time}`}
                          type="button"
                          disabled
                          title={t.taken}
                          aria-label={`${time} — ${t.taken}`}
                          className="cursor-not-allowed rounded-lg border border-dashed border-line/70 py-2.5 font-display text-sm text-muted/45 line-through"
                          dir="ltr"
                        >
                          {time}
                        </button>
                      ),
                    )}
                  </div>
                  {slots.length === 0 && <p className="mt-4 text-sm text-muted">{t.noSlots}</p>}
                  {taken.length > 0 && (
                    <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                      <span aria-hidden="true" className="inline-block h-3 w-5 rounded border border-dashed border-line" /> {t.taken}
                    </p>
                  )}
                </>
              )}
            </div>

            {error?.error === "taken" && <p className="mt-4 text-sm text-amber-300">{t.errors.taken}</p>}

            <div className="mt-8 flex justify-between gap-3">
              <button type="button" onClick={() => setStep(0)} className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-3 text-sm">
                <ArrowLeft size={16} className="rtl:rotate-180" /> {t.back}
              </button>
              <button
                type="button"
                disabled={!slot}
                onClick={() => {
                  setResult(null);
                  setStep(2);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-fg px-6 py-3 text-sm font-bold text-bg transition-opacity disabled:opacity-30"
              >
                {t.next} <ArrowRight size={16} className="rtl:rotate-180" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && specialty && slot && (
          <motion.form
            key="s2"
            action={submit}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease }}
            className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
          >
            <div className="glass space-y-5 rounded-3xl p-6 md:p-8">
              {(
                [
                  ["name", t.name, "text", "name"],
                  ["phone", t.phone, "tel", "tel"],
                  ["email", t.email, "email", "email"],
                ] as const
              ).map(([name, label, type, auto]) => (
                <label key={name} className="block">
                  <span className="text-sm text-muted">{label}</span>
                  <input
                    name={name}
                    type={type}
                    autoComplete={auto}
                    required
                    maxLength={name === "email" ? 120 : 80}
                    dir={name === "name" ? undefined : "ltr"}
                    aria-invalid={fieldError(name) || undefined}
                    aria-describedby={name === "phone" ? "phone-hint" : undefined}
                    inputMode={name === "phone" ? "tel" : undefined}
                    className={`mt-2 w-full rounded-xl border bg-bg-2 px-4 py-3 outline-none transition-colors focus:border-accent ${
                      fieldError(name) ? "border-red-400/70" : "border-line"
                    }`}
                  />
                  {name === "phone" && !fieldError(name) && (
                    <span id="phone-hint" className="mt-1 block text-xs text-subtle">
                      {t.phoneHint}
                    </span>
                  )}
                  {fieldError(name) && <span className="mt-1 block text-xs text-red-300">{t.fields[name]}</span>}
                </label>
              ))}
              <label className="block">
                <span className="text-sm text-muted">{t.reason}</span>
                <textarea
                  name="reason"
                  rows={2}
                  maxLength={200}
                  aria-describedby="reason-hint"
                  className="mt-2 w-full rounded-xl border border-line bg-bg-2 px-4 py-3 outline-none focus:border-accent"
                />
                <span id="reason-hint" className="mt-1 block text-xs text-subtle">
                  {t.reasonHint}
                </span>
              </label>
              {/* honeypot — hidden from humans */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
              <label className="flex items-start gap-3 text-sm text-muted">
                <input name="consent" type="checkbox" required className="mt-1 size-4 accent-[var(--accent)]" />
                <span>
                  {t.consent}{" "}
                  <a href={`/${locale}/confidentialite`} target="_blank" rel="noopener" className="text-accent underline underline-offset-2">
                    {privacyLabel}
                  </a>
                </span>
              </label>
              {error && error.error !== "taken" && (
                <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {t.errors[error.error]}
                </p>
              )}
            </div>

            <aside className="glass flex flex-col rounded-3xl p-6 md:p-8">
              <p className="eyebrow">{t.summary}</p>
              <p className="mt-5 flex items-center gap-3 font-display text-xl font-semibold">
                <SpecialtyIcon id={specialty} size={20} className="text-accent" />
                {specs[specialty].name}
              </p>
              <p className="mt-4 flex items-center gap-3 text-muted">
                <CalendarCheck size={18} />
                {dayLabel(day, { weekday: "long", day: "numeric", month: "long" })} · <span dir="ltr">{slot.time}</span>
              </p>
              <p className="mt-2 flex items-center gap-3 text-muted">
                <UserRound size={18} />
                {doctors.find((d) => d.id === (doctorId ?? slot.doctorId))?.name ?? t.anyDoctor}
              </p>
              <div className="mt-auto flex flex-col gap-3 pt-10">
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 font-bold text-[#04121a] disabled:opacity-60"
                  style={{ background: "linear-gradient(90deg, var(--accent), #7dd3fc)" }}
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  {sending ? t.sending : t.submit}
                </button>
                <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-line px-5 py-3 text-sm">
                  {t.back}
                </button>
              </div>
            </aside>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
