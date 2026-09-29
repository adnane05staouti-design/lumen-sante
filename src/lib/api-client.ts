/** Browser helpers for the cached, public availability API (GET: cacheable by the CDN). */
export type ApiSlot = { doctorId: string; time: string; startsAt: string };
export type WidgetAvailability = {
  days: string[];
  next: { day: string; time: string } | null;
  today: string;
  tomorrow: string;
};

export async function fetchSlots(p: { specialty: string; day: string; doctorId?: string }): Promise<{ slots: ApiSlot[]; error?: string }> {
  const q = new URLSearchParams({ specialty: p.specialty, day: p.day });
  if (p.doctorId) q.set("doctor", p.doctorId);
  try {
    const res = await fetch(`/api/slots?${q}`);
    if (!res.ok) return { slots: [], error: "server" };
    return (await res.json()) as { slots: ApiSlot[] };
  } catch {
    return { slots: [], error: "network" };
  }
}

export async function fetchWidget(specialty: string): Promise<WidgetAvailability> {
  try {
    const res = await fetch(`/api/availability?${new URLSearchParams({ specialty })}`);
    if (res.ok) return (await res.json()) as WidgetAvailability;
  } catch {
    /* fall through */
  }
  return { days: [], next: null, today: "", tomorrow: "" };
}
