"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { fetchSlots, fetchWidget, type WidgetAvailability } from "@/lib/api-client";
import { clinic, type SpecialtyId } from "@/config/clinic";
import type { Dictionary } from "@/dictionaries";
import type { SpecialtyTexts } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";
import { SpecialtyIcon } from "@/components/ui/SpecialtyIcon";

type Slot = { doctorId: string; time: string; startsAt: string };
const ease = [0.16, 1, 0.3, 1] as const;
const MAX_SLOTS = 6;

/** Day labels are built from the ISO date ("YYYY-MM-DD", clinic time) so they never depend on the visitor's time zone. */
const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();
const dayNum = (day: string) => Number(day.slice(8, 10));

/**
 * Hero booking widget, connected to the real booking engine:
 * days and times come from the database (doctors' schedules, absences, existing appointments, rules).
 * Choosing a time opens the booking page with everything pre-filled.
 */
export function BookingWidget({ locale, t, specs }: { locale: Locale; t: Dictionary["booking"]; specs: SpecialtyTexts }) {
  const [specialty, setSpecialty] = useState<SpecialtyId>(clinic.specialties[0]);
  const [info, setInfo] = useState<WidgetAvailability | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [loadingDays, startDays] = useTransition();
  const [loadingSlots, startSlots] = useTransition();

  // specialty → bookable days + next free slot
  useEffect(() => {
    let alive = true;
    startDays(async () => {
      // a network / server problem must never break the home page: the widget just shows no times
      const res = await fetchWidget(specialty);
      if (!alive) return;
      setInfo(res);
      setDay(res.next?.day && res.days.includes(res.next.day) ? res.next.day : (res.days[0] ?? null));
    });
    return () => {
      alive = false;
    };
  }, [specialty]);

  // day → free times
  useEffect(() => {
    if (!day) return;
    let alive = true;
    startSlots(async () => {
      const res = await fetchSlots({ specialty, day });
      if (!alive) return;
      setSlots(res.slots);
      setSlot(null);
    });
    return () => {
      alive = false;
    };
  }, [specialty, day]);

  /** "today" / "tomorrow" / "Tue 30" (dates given by the server, in the clinic's time zone) */
  const relative = (d: string) => {
    if (d === info?.today) return t.today;
    if (d === info?.tomorrow) return t.tomorrow;
    return `${t.days[weekday(d)]} ${dayNum(d)}`;
  };

  const shown = slots?.slice(0, MAX_SLOTS) ?? [];
  const href = `/${locale}/rendez-vous?specialty=${specialty}${day ? `&day=${day}` : ""}${slot ? `&time=${slot}` : ""}`;

  return (
    <div className="glass w-full rounded-2xl p-5 shadow-[0_40px_80px_-40px_rgba(0,0,0,.8)]">
      <div className="flex items-center justify-between">
        <p className="font-display font-semibold">{t.title}</p>
        <p className="flex items-center gap-1.5 text-[0.7rem] text-muted">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
          </span>
          {t.live}
        </p>
      </div>

      <p className="mt-4 text-xs text-subtle">{t.specialty}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {clinic.specialties.slice(0, 4).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setSpecialty(id)}
            aria-pressed={specialty === id}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all active:scale-95 ${
              specialty === id ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:border-line-strong hover:text-fg"
            }`}
          >
            <SpecialtyIcon id={id} size={13} />
            {specs[id].name}
          </button>
        ))}
      </div>

      {/* next free slot, from the database */}
      <div className="mt-4 flex h-9 items-center justify-between rounded-lg border border-line bg-bg/50 px-3 text-xs">
        <span className="text-subtle">{t.nextSlot}</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={loadingDays ? "…" : `${info?.next?.day}-${info?.next?.time}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease }}
            className="font-display font-semibold text-accent"
          >
            {loadingDays || !info ? (
              <Loader2 size={14} className="animate-spin" />
            ) : info.next ? (
              <>
                {relative(info.next.day)} · <span dir="ltr">{info.next.time}</span>
              </>
            ) : (
              "—"
            )}
          </motion.span>
        </AnimatePresence>
      </div>

      <p className="mt-4 text-xs text-subtle">{t.date}</p>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {!info &&
          Array.from({ length: 5 }, (_, i) => <span key={i} className="h-[46px] animate-pulse rounded-lg border border-line" />)}
        {info?.days.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDay(d)}
            aria-pressed={day === d}
            className={`rounded-lg border py-2 text-center transition-all active:scale-95 ${
              day === d ? "border-fg bg-fg text-bg" : "border-line text-muted hover:border-line-strong hover:text-fg"
            }`}
          >
            <span className="block text-[0.65rem] opacity-70">{t.days[weekday(d)]}</span>
            <span className="font-display text-sm font-semibold">{dayNum(d)}</span>
          </button>
        ))}
      </div>

      <div className="relative mt-4 min-h-[84px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`${specialty}-${day}-${loadingSlots}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease }}
            className="grid grid-cols-3 gap-1.5"
          >
            {loadingSlots || slots === null ? (
              Array.from({ length: 6 }, (_, i) => <span key={i} className="h-[38px] animate-pulse rounded-lg border border-line" />)
            ) : shown.length === 0 ? (
              <p className="col-span-3 py-6 text-center text-xs text-muted">{t.noSlot}</p>
            ) : (
              shown.map((s, i) => (
                <motion.button
                  key={s.startsAt}
                  type="button"
                  onClick={() => setSlot(s.time)}
                  aria-pressed={slot === s.time}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.035, duration: 0.3, ease }}
                  className={`rounded-lg border py-2 font-display text-sm transition-colors active:scale-95 ${
                    slot === s.time ? "border-accent bg-accent/10 text-accent" : "border-line hover:border-line-strong"
                  }`}
                  dir="ltr"
                >
                  {s.time}
                </motion.button>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <Link
        href={href}
        className="group mt-4 flex items-center justify-center gap-2 rounded-xl bg-fg py-3 text-center text-sm font-bold text-bg transition-transform hover:-translate-y-0.5"
      >
        {t.next}
        {slot && (
          <span className="rounded-md bg-bg/10 px-1.5 py-0.5 font-display text-xs" dir="ltr">
            {slot}
          </span>
        )}
        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
      </Link>
    </div>
  );
}
