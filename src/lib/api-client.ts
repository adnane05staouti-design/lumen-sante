/** Browser helpers for the cached, public availability API (GET: cacheable by the CDN). */
export type ApiSlot = { doctorId: string; time: string; startsAt: string };
export type WidgetAvailability = {
  days: string[];
  next: { day: string; time: string } | null;
  full: string[];
  today: string;
  tomorrow: string;
};

export async function fetchSlots(p: { specialty: string; day: string; doctorId?: string }): Promise<{ slots: ApiSlot[]; taken: string[]; error?: string }> {
  const q = new URLSearchParams({ specialty: p.specialty, day: p.day });
  if (p.doctorId) q.set("doctor", p.doctorId);
  try {
    const res = await fetch(`/api/slots?${q}`);
    if (!res.ok) return { slots: [], taken: [], error: "server" };
    const data = (await res.json()) as { slots: ApiSlot[]; taken?: string[] };
    return { slots: data.slots, taken: data.taken ?? [] };
  } catch {
    return { slots: [], taken: [], error: "network" };
  }
}

export async function fetchWidget(specialty: string): Promise<WidgetAvailability> {
  try {
    const res = await fetch(`/api/availability?${new URLSearchParams({ specialty })}`);
    if (res.ok) return (await res.json()) as WidgetAvailability;
  } catch {
    /* fall through */
  }
  return { days: [], next: null, full: [], today: "", tomorrow: "" };
}
