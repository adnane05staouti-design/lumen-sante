import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Serves an uploaded image. Ids are random and never reused, so the file can be cached forever.
 */
export async function GET(_req: Request, ctx: RouteContext<"/media/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const row = await db.query.media.findFirst({ where: eq(schema.media.id, id) });
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mime,
      "Content-Length": String(row.bytes),
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
