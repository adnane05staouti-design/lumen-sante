"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ComponentProps } from "react";
import { addDays, clinicDay, weekdayOf } from "@/lib/time";
import { BookingFlow } from "./BookingFlow";

type Props = Omit<ComponentProps<typeof BookingFlow>, "days" | "initial"> & { weekdays: number[]; maxDaysAhead: number };

/**
 * Lets the booking page be served as a static, cached page (fast under heavy traffic):
 * the pre-selection (?specialty=&day=&time=) and the list of days (today, in the clinic's time zone)
 * are read in the browser.
 */
export function BookingFlowLoader({ weekdays, maxDaysAhead, ...rest }: Props) {
  const sp = useSearchParams();
  const [days, setDays] = useState<string[] | null>(null);

  useEffect(() => {
    const working = new Set(weekdays);
    const today = clinicDay(new Date());
    const out: string[] = [];
    // the whole booking window set by the clinic (capped at 6 months to keep the day picker usable)
    for (let i = 0; i <= Math.min(maxDaysAhead, 180); i++) {
      const d = addDays(today, i);
      if (working.has(weekdayOf(d))) out.push(d);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- computed once in the browser (depends on the current date)
    setDays(out);
  }, [weekdays, maxDaysAhead]);

  if (!days) return <div aria-busy="true" className="mx-auto h-[420px] max-w-3xl animate-pulse rounded-3xl border border-line bg-surface" />;
  const get = (k: string) => sp.get(k) ?? undefined;
  return <BookingFlow {...rest} days={days} initial={{ specialty: get("specialty"), doctor: get("doctor"), day: get("day"), time: get("time") }} />;
}
