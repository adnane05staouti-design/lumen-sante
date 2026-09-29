"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";

const MAX_SIDE = 2000;
const TARGET_BYTES = 1.5 * 1024 * 1024;

/**
 * File input for photos: large pictures (straight from a phone) are downscaled in the browser
 * before upload, so they stay under the server limit and upload fast. A preview is shown.
 */
export function ImageInput({ name, label, current, maxSide = MAX_SIDE }: { name: string; label: string; current?: string | null; maxSide?: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current ?? null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setInfo("");
    if (!file.type.startsWith("image/")) {
      setInfo("Ce fichier n'est pas une image.");
      e.target.value = "";
      return;
    }
    let out: File = file;
    if (file.type !== "image/svg+xml") {
      setBusy(true);
      try {
        const bmp = await createImageBitmap(file);
        const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
        if (scale < 1 || file.size > TARGET_BYTES) {
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(bmp.width * scale);
          canvas.height = Math.round(bmp.height * scale);
          canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
          const keepAlpha = file.type === "image/png";
          const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, keepAlpha ? "image/png" : "image/jpeg", 0.85));
          if (blob) out = new File([blob], file.name.replace(/\.\w+$/, keepAlpha ? ".png" : ".jpg"), { type: blob.type });
        }
        bmp.close();
      } catch {
        /* the server validates the file anyway */
      }
      setBusy(false);
    }
    const dt = new DataTransfer();
    dt.items.add(out);
    if (ref.current) ref.current.files = dt.files;
    setPreview(URL.createObjectURL(out));
    setInfo(`${Math.round(out.size / 1024)} Ko`);
  }

  return (
    <div>
      <span className="text-xs text-muted">{label}</span>
      <label className="mt-1.5 flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-line-strong bg-bg-2 p-3 transition-colors hover:border-accent">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview (blob URL)
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={22} className="text-muted" />
          )}
        </span>
        <span className="text-sm">
          <span className="font-semibold text-fg">{busy ? "Préparation…" : "Choisir une image"}</span>
          <span className="block text-xs text-muted">JPG, PNG ou WebP · {info || "redimensionnée automatiquement"}</span>
        </span>
        <input ref={ref} type="file" name={name} accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml" className="sr-only" onChange={onChange} />
      </label>
    </div>
  );
}
