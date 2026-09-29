import "server-only";
import sharp from "sharp";
import { db, schema } from "@/db";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB (photos are downscaled in the browser before upload)
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"];

export type UploadResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Validates and stores an uploaded image.
 *  - size and type checked, then the file is really decoded (a fake "image" is rejected);
 *  - photos are resized (max 2000 px) and re-encoded as WebP: metadata (GPS, camera…) is removed;
 *  - SVG logos are rasterised to PNG (an SVG file could carry scripts).
 */
export async function storeImage(file: File, opts: { maxSide?: number } = {}): Promise<UploadResult> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Aucun fichier." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Image trop lourde (4 Mo maximum)." };
  if (!ACCEPTED.includes(file.type)) return { ok: false, error: "Format accepté : JPG, PNG, WebP, AVIF ou SVG." };

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const img = sharp(input, { limitInputPixels: 50_000_000 }).rotate();
    const meta = await img.metadata();
    if (!meta.width || !meta.height) return { ok: false, error: "Fichier image illisible." };
    const max = opts.maxSide ?? 2000;
    const keepAlpha = file.type === "image/png" || file.type === "image/svg+xml" || meta.hasAlpha;
    const pipeline = img.resize({ width: max, height: max, fit: "inside", withoutEnlargement: true });
    const { data, info } = keepAlpha
      ? await pipeline.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
      : await pipeline.webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    const [row] = await db
      .insert(schema.media)
      .values({ mime: keepAlpha ? "image/png" : "image/webp", data, width: info.width, height: info.height, bytes: data.length })
      .returning({ id: schema.media.id });
    return { ok: true, id: row.id };
  } catch (error) {
    console.error("[media] upload failed:", error);
    return { ok: false, error: "Impossible de lire cette image." };
  }
}
