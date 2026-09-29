import "server-only";
import { unstable_cache } from "next/cache";
import { clinic, type SpecialtyId } from "@/config/clinic";
import { db, schema } from "@/db";
import { getDictionary, type Dictionary } from "@/dictionaries";
import { specialtyInfo, type SpecialtyInfo } from "@/dictionaries/specialties";
import type { Locale } from "@/lib/i18n";

/**
 * Editable content. The code holds the default values (src/config/clinic.ts, src/dictionaries);
 * the database (table site_content) only stores what the clinic changed in /admin/contenu.
 * Result = defaults deep-merged with the stored values.
 */

export const CONTENT_TAG = "site-content";

import type { GalleryItem, Identity, SpecialtyTexts, Stat } from "@/lib/content-types";
export type { GalleryItem, Identity, SpecialtyTexts, Stat };

export type TextOverrides = Partial<Record<Locale, Record<string, unknown>>>;

export type Site = {
  identity: Identity;
  stats: Stat[];
  gallery: GalleryItem[];
  specialties: Record<SpecialtyId, SpecialtyInfo>;
};

type Stored = {
  identity?: Partial<Identity>;
  texts?: TextOverrides;
  specialties?: Partial<Record<SpecialtyId, Partial<SpecialtyInfo>>>;
  stats?: Stat[];
  gallery?: GalleryItem[];
};

export const defaultIdentity = (): Identity => ({
  name: clinic.name,
  logo: null,
  phone: clinic.phone,
  whatsapp: clinic.whatsapp,
  email: clinic.email,
  address: { ...clinic.address },
  hours: { ...clinic.hours },
  theme: { ...clinic.theme },
});

/** Raw stored blocks, cached until an admin saves (revalidateTag) or at most one hour. */
const readStored = unstable_cache(
  async (): Promise<Stored> => {
    const rows = await db.select().from(schema.siteContent);
    return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Stored;
  },
  ["site-content-v1"],
  { tags: [CONTENT_TAG], revalidate: 3600 },
);

/** Never breaks a page: if the database is unreachable (e.g. at build time) the defaults are used. */
export async function getStored(): Promise<Stored> {
  try {
    return await readStored();
  } catch (error) {
    console.error("[content] using defaults, database unreachable:", (error as Error).message);
    return {};
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Deep merge: objects are merged key by key, strings/arrays from `over` replace the default when valid. */
export function deepMerge<T>(base: T, over: unknown): T {
  if (over === undefined || over === null) return base;
  if (isObject(base) && isObject(over)) {
    const out: Record<string, unknown> = { ...base };
    for (const k of Object.keys(base)) out[k] = deepMerge((base as Record<string, unknown>)[k], over[k]);
    return out as T;
  }
  if (Array.isArray(base)) {
    if (!Array.isArray(over)) return base;
    // arrays of objects keep the default shape of their first element
    if (base.length && isObject(base[0])) return over.map((o, i) => deepMerge(base[i] ?? base[0], o)) as T;
    return over.filter((x) => typeof x === "string" && x.trim()) as T;
  }
  if (typeof base === "string") return (typeof over === "string" && over.trim() ? over : base) as T;
  if (typeof base === "number") return (typeof over === "number" && Number.isFinite(over) ? over : base) as T;
  return base;
}

export async function getSite(): Promise<Site> {
  const s = await getStored();
  const identity = deepMerge(defaultIdentity(), s.identity);
  identity.logo = typeof s.identity?.logo === "string" ? s.identity.logo : null;
  const specialties = Object.fromEntries(
    (Object.keys(specialtyInfo) as SpecialtyId[]).map((id) => [id, deepMerge(specialtyInfo[id], s.specialties?.[id])]),
  ) as Record<SpecialtyId, SpecialtyInfo>;
  // lists are validated when saved (admin action), so they are used as stored
  const stats = Array.isArray(s.stats) && s.stats.length ? s.stats : (clinic.stats as Stat[]);
  const gallery = Array.isArray(s.gallery) ? s.gallery : (clinic.gallery as GalleryItem[]);
  return { identity, stats, gallery, specialties };
}

export async function getTexts(locale: Locale): Promise<Dictionary> {
  const s = await getStored();
  return deepMerge(getDictionary(locale), s.texts?.[locale]);
}

/** Everything a public page needs. */
export async function getPageData(locale: Locale) {
  const [site, t] = await Promise.all([getSite(), getTexts(locale)]);
  return { site, t };
}

/** URL of an uploaded image. */
export const mediaUrl = (id: string) => `/media/${id}`;

/** Specialty texts for one language (what client components need). */
export function localizeSpecialties(site: Site, locale: Locale): SpecialtyTexts {
  return Object.fromEntries(
    Object.entries(site.specialties).map(([id, s]) => [id, { name: s.name[locale], short: s.short[locale], services: s.services[locale], duration: s.duration }]),
  ) as SpecialtyTexts;
}

/** French specialty names as edited in the CMS (used by the admin pages). */
export async function specialtyNames(): Promise<Record<string, string>> {
  const site = await getSite();
  return Object.fromEntries(Object.entries(site.specialties).map(([slug, s]) => [slug, s.name.fr]));
}
