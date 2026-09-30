import { getDaySlots } from "@/lib/availability";
import { isValidDay } from "@/lib/time";

/**
 * GET /api/slots?specialty=dentaire&day=2026-10-02[&doctor=<uuid>] → free times of one day, plus the times already booked (greyed out in the UI).
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
    !isValidDay(day) || // strict calendar date: 2026-02-30 is refused
    (doctor !== null && !/^[0-9a-f-]{36}$/.test(doctor))
  ) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  try {
    const result = await getDaySlots(slug, day, doctor);
    if (result === null) return Response.json({ error: "unknown specialty" }, { status: 404 });
    return Response.json(
      result,
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=30" } },
    );
  } catch (error) {
    console.error("[api/slots]", (error as Error).message);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
