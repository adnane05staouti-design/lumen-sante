import { getDaySlots } from "@/lib/availability";

/**
 * GET /api/slots?specialty=dentaire&day=2026-10-02[&doctor=<uuid>] → free times of one day.
 * Public and read-only; cached a few seconds (every booking refreshes the cache immediately,
 * and the booking action always re-checks the slot in the database).
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const slug = q.get("specialty") ?? "";
  const day = q.get("day") ?? "";
  const doctor = q.get("doctor");
  if (
    !/^[a-z-]{2,40}$/.test(slug) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    Number.isNaN(Date.parse(`${day}T00:00:00Z`)) ||
    (doctor !== null && !/^[0-9a-f-]{36}$/.test(doctor))
  ) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  try {
    const slots = await getDaySlots(slug, day, doctor);
    if (slots === null) return Response.json({ error: "invalid" }, { status: 400 });
    return Response.json(
      { slots },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=30" } },
    );
  } catch (error) {
    console.error("[api/slots]", (error as Error).message);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
