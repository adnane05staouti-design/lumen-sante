/** Public URL of the site (links in e-mails, SEO). Invalid or empty values fall back safely. */
export function siteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
    "http://localhost:3000",
  ];
  for (const value of candidates) {
    const url = value?.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
    if (!url) continue;
    try {
      if (/^https?:$/.test(new URL(url).protocol)) return url;
    } catch {
      /* try next */
    }
  }
  return "http://localhost:3000";
}
