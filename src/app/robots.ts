import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/fr/rendez-vous/annuler", "/en/rendez-vous/annuler", "/ar/rendez-vous/annuler"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
