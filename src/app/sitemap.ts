import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return ["", "/medecins", "/rendez-vous"].flatMap((path) =>
    locales.map((l) => ({
      url: `${base}/${l}${path}`,
      alternates: { languages: Object.fromEntries(locales.map((x) => [x, `${base}/${x}${path}`])) },
    })),
  );
}
