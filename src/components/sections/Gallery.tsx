import Image from "next/image";
import { Languages, ScanLine, ShieldCheck, Video } from "lucide-react";
import type { GalleryItem } from "@/lib/content-types";
import type { Dictionary } from "@/dictionaries";
import type { Locale } from "@/lib/i18n";
import { TextReveal } from "@/components/fx/TextReveal";

const icons = [ScanLine, ShieldCheck, Video, Languages];

/**
 * "The center": a bento grid of photos (first one large) that open up as they scroll into view.
 * Normal scrolling (no horizontal scroll-jacking): easier to use on every device.
 * Server component, no JavaScript.
 */
export function Gallery({ locale, t, center, gallery }: { locale: Locale; t: Dictionary["fx"]; center: Dictionary["center"]; gallery: GalleryItem[] }) {
  return (
    <section id="centre" className="relative scroll-mt-20 py-24 md:py-32" data-shape="field" data-shape-dim="0.35">
      <div className="container-x">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-end">
          <div>
            <p className="eyebrow">{t.galleryEyebrow}</p>
            <TextReveal
              text={t.galleryTitle}
              className="mt-4 font-display text-[clamp(2.2rem,4.4vw,4rem)] font-semibold leading-[1.02] tracking-[-0.035em] rtl:leading-[1.25] rtl:tracking-normal"
            />
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">{t.galleryLead}</p>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {center.items.map((it, i) => {
              const Icon = icons[i % icons.length];
              return (
                <li key={it.t} data-tilt className="rounded-2xl border border-line bg-bg/60 p-4 backdrop-blur">
                  <Icon size={18} strokeWidth={1.6} className="text-accent" />
                  <p className="mt-3 text-sm font-semibold">{it.t}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{it.d}</p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-14 grid auto-rows-[200px] grid-cols-2 gap-4 md:auto-rows-[240px] lg:grid-cols-4">
          {gallery.map((g, i) => (
            <figure
              key={g.src}
              data-inview
              style={{ transitionDelay: `${(i % 3) * 0.08}s` }}
              className={`reveal-photo group relative overflow-hidden rounded-3xl border border-line ${i === 0 ? "col-span-2 row-span-2" : ""}`}
            >
              <Image
                src={g.src}
                alt={g.caption[locale]}
                fill
                sizes={i === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                className="object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 md:p-6">
                <span className={`font-display font-semibold text-white ${i === 0 ? "text-2xl md:text-3xl" : "text-lg"}`}>{g.caption[locale]}</span>
                <span className="font-display text-sm text-white/60 tabular-nums" dir="ltr">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
