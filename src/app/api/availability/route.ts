import { getSpecialtyBySlug, getWidgetAvailability, todayInClinic } from "@/lib/availability";

/**
 * GET /api/availability?specialty=dentaire → days + next free slot for the home widget.
 * Public, read-only and identical for every visitor: cached on the server and at the CDN.
 */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("specialty") ?? "";
  if (!/^[a-z-]{2,40}$/.test(slug)) return Response.json({ error: "invalid" }, { status: 400 });
  try {
    if (!(await getSpecialtyBySlug(slug))) return Response.json({ error: "unknown specialty" }, { status: 404 });
    const data = await getWidgetAvailability(slug, todayInClinic());
    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[api/availability]", (error as Error).message);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
