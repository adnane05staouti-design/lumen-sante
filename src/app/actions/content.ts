"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { clinic, type SpecialtyId } from "@/config/clinic";
import { db, schema } from "@/db";
import { getDictionary } from "@/dictionaries";
import { audit, requireUser } from "@/lib/auth";
import { CONTENT_TAG, getStored, getSite, type GalleryItem, type Stat } from "@/lib/content";
import { locales, type Locale } from "@/lib/i18n";
import { storeImage } from "@/lib/media";
import type { FormState } from "./admin";

/* ---------------------------------------------------------------- helpers */

const MAX_TEXT = 1000;
const MAX_ITEMS = 20;
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Plain text only: control characters removed, length capped. (React escapes it when rendering.) */
const clean = (v: FormDataEntryValue | null, max = MAX_TEXT) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);

const lines = (v: FormDataEntryValue | null) =>
  clean(v, 4000)
    .split("\n")
    .map((l) => l.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, MAX_ITEMS);

async function save(key: string, value: unknown) {
  await db
    .insert(schema.siteContent)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.siteContent.key, set: { value, updatedAt: new Date() } });
}

/** Makes the change visible at once on every page. */
function publish() {
  revalidateTag(CONTENT_TAG, { expire: 0 });
  revalidatePath("/", "layout");
}

/** Keys that could reach Object.prototype: always refused (prototype pollution). */
const FORBIDDEN = new Set(["__proto__", "prototype", "constructor"]);

function setPath(target: Record<string, unknown>, path: string[], value: unknown) {
  if (path.some((k) => FORBIDDEN.has(k))) return;
  let node: Record<string, unknown> = target;
  path.forEach((key, i) => {
    if (i === path.length - 1) node[key] = value;
    else {
      const nextIsIndex = /^\d+$/.test(path[i + 1]);
      if (!Object.hasOwn(node, key)) node[key] = nextIsIndex ? [] : Object.create(null);
      node = node[key] as Record<string, unknown>;
    }
  });
}

const isLocale = (l: string): l is Locale => (locales as readonly string[]).includes(l);

const mediaIdOf = (src: string) => src.match(/^\/media\/([0-9a-f-]{36})$/)?.[1] ?? null;
async function deleteMedia(id: string) {
  await db.delete(schema.media).where(eq(schema.media.id, id));
}

/* ---------------------------------------------------------------- texts */

/**
 * Saves one section of the site texts (hero, cta, footer…).
 * Field names: "t|<path>|<locale>" for a text, "l|<path>|<locale>" for a list (one item per line).
 */
export async function saveTexts(section: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("ADMIN");
  if (typeof section !== "string" || FORBIDDEN.has(section) || !Object.hasOwn(getDictionary("fr"), section)) {
    return { error: "Section inconnue." };
  }

  const next: Record<Locale, Record<string, unknown>> = { fr: Object.create(null), en: Object.create(null), ar: Object.create(null) };
  for (const [name, value] of form.entries()) {
    const [kind, path, lang] = name.split("|");
    if ((kind !== "t" && kind !== "l") || !path || !isLocale(lang)) continue;
    const segments = path.split(".");
    if (segments[0] !== section || segments.length > 6 || segments.some((s) => !/^[\w-]+$/.test(s) || FORBIDDEN.has(s))) continue;
    setPath(next[lang], segments, kind === "l" ? lines(value) : clean(value));
  }

  const stored = await getStored();
  const texts = { ...(stored.texts ?? {}) };
  for (const l of locales) texts[l] = { ...(texts[l] ?? {}), [section]: next[l][section] };
  await save("texts", texts);
  await audit(user.id, "content.texts", section);
  publish();
  return { ok: true };
}

/* ---------------------------------------------------------------- identity */

export async function saveIdentity(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("ADMIN");
  const accent = clean(form.get("accent"), 7);
  const accent2 = clean(form.get("accent2"), 7);
  if (!HEX.test(accent) || !HEX.test(accent2)) return { error: "Couleur invalide (format #RRGGBB)." };
  const email = clean(form.get("email"), 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail invalide." };
  const name = clean(form.get("name"), 60);
  if (!name) return { error: "Le nom du cabinet est obligatoire." };

  const stored = await getStored();
  const previousLogo: string | null = typeof stored.identity?.logo === "string" ? stored.identity.logo : null;
  let logo = previousLogo;
  const file = form.get("logo");
  if (file instanceof File && file.size > 0) {
    const res = await storeImage(file, { maxSide: 512 });
    if (!res.ok) return { error: res.error };
    logo = res.id;
  }
  if (form.get("removeLogo") === "on") logo = null;

  await save("identity", {
    name,
    logo,
    phone: clean(form.get("phone"), 40),
    whatsapp: clean(form.get("whatsapp"), 40),
    email,
    address: { fr: clean(form.get("address|fr"), 200), en: clean(form.get("address|en"), 200), ar: clean(form.get("address|ar"), 200) },
    hours: { weekdays: clean(form.get("weekdays"), 40), saturday: clean(form.get("saturday"), 40) },
    theme: { accent, accent2 },
  });
  if (previousLogo && previousLogo !== logo) await deleteMedia(previousLogo); // the old file is no longer public
  await audit(user.id, "content.identity", name);
  publish();
  return { ok: true };
}

/* ---------------------------------------------------------------- specialties */

export async function saveSpecialtyTexts(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("ADMIN");
  const out: Record<string, unknown> = {};
  for (const id of clinic.specialties as SpecialtyId[]) {
    const entry: Record<string, Record<Locale, unknown>> = { name: {} as never, short: {} as never, services: {} as never };
    for (const l of locales) {
      entry.name[l] = clean(form.get(`${id}|name|${l}`), 60);
      entry.short[l] = clean(form.get(`${id}|short|${l}`), 300);
      entry.services[l] = lines(form.get(`${id}|services|${l}`)).slice(0, 8);
    }
    out[id] = entry;
  }
  await save("specialties", out);
  await audit(user.id, "content.specialties", "");
  publish();
  return { ok: true };
}

/* ---------------------------------------------------------------- stats */

export async function saveStats(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("ADMIN");
  const site = await getSite();
  const stats: Stat[] = site.stats.map((s, i) => {
    const value = Number(form.get(`${i}|value`));
    return {
      live: s.live, // "live" figures stay counted in the database
      value: s.live ? 0 : Number.isFinite(value) && value >= 0 && value < 1e6 ? Math.round(value) : s.value,
      prefix: clean(form.get(`${i}|prefix`), 6),
      suffix: clean(form.get(`${i}|suffix`), 6),
      label: { fr: clean(form.get(`${i}|label|fr`), 40), en: clean(form.get(`${i}|label|en`), 40), ar: clean(form.get(`${i}|label|ar`), 40) },
    };
  });
  await save("stats", stats);
  await audit(user.id, "content.stats", "");
  publish();
  return { ok: true };
}

/* ---------------------------------------------------------------- gallery */

const MAX_GALLERY = 9;

export async function addGalleryPhoto(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("ADMIN");
  const site = await getSite();
  if (site.gallery.length >= MAX_GALLERY) return { error: `${MAX_GALLERY} photos maximum.` };
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisissez une photo." };
  const res = await storeImage(file);
  if (!res.ok) return { error: res.error };
  const item: GalleryItem = {
    src: `/media/${res.id}`,
    caption: { fr: clean(form.get("caption|fr"), 60), en: clean(form.get("caption|en"), 60), ar: clean(form.get("caption|ar"), 60) },
  };
  await save("gallery", [...site.gallery, item]);
  await audit(user.id, "content.gallery.add", item.caption.fr);
  publish();
  return { ok: true };
}

export async function saveGalleryCaptions(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("ADMIN");
  const site = await getSite();
  const gallery = site.gallery.map((g, i) => ({
    src: g.src,
    caption: { fr: clean(form.get(`${i}|fr`), 60), en: clean(form.get(`${i}|en`), 60), ar: clean(form.get(`${i}|ar`), 60) },
  }));
  await save("gallery", gallery);
  await audit(user.id, "content.gallery.captions", "");
  publish();
  return { ok: true };
}

export async function moveGalleryPhoto(index: number, direction: -1 | 1) {
  const user = await requireUser("ADMIN");
  if (direction !== 1 && direction !== -1) return;
  const gallery = [...(await getSite()).gallery];
  const j = index + direction;
  if (!Number.isInteger(index) || index < 0 || index >= gallery.length || j < 0 || j >= gallery.length) return;
  [gallery[index], gallery[j]] = [gallery[j], gallery[index]];
  await save("gallery", gallery);
  await audit(user.id, "content.gallery.move", String(index));
  publish();
}

export async function deleteGalleryPhoto(index: number) {
  const user = await requireUser("ADMIN");
  const gallery = [...(await getSite()).gallery];
  if (!Number.isInteger(index) || index < 0 || index >= gallery.length) return;
  const [removed] = gallery.splice(index, 1);
  await save("gallery", gallery);
  const id = mediaIdOf(removed.src);
  if (id) await deleteMedia(id);
  await audit(user.id, "content.gallery.delete", removed.caption.fr);
  publish();
}

/* ---------------------------------------------------------------- reset */

const RESETTABLE = ["identity", "texts", "specialties", "stats", "gallery"];

/** Back to the default content for one block (texts: one section only). */
export async function resetContent(key: string, section?: string) {
  const user = await requireUser("ADMIN");
  if (!RESETTABLE.includes(key)) return;
  if (key === "texts" && section && !FORBIDDEN.has(section)) {
    const stored = await getStored();
    const texts = { ...(stored.texts ?? {}) };
    for (const l of locales) if (texts[l]) delete (texts[l] as Record<string, unknown>)[section];
    await save("texts", texts);
  } else {
    // uploaded files of this block are deleted too (they would otherwise stay reachable)
    const site = await getSite();
    const stored = await getStored();
    if (key === "identity" && typeof stored.identity?.logo === "string") await deleteMedia(stored.identity.logo);
    if (key === "gallery") for (const g of site.gallery) { const id = mediaIdOf(g.src); if (id) await deleteMedia(id); }
    await db.delete(schema.siteContent).where(eq(schema.siteContent.key, key));
  }
  await audit(user.id, "content.reset", section ? `${key}.${section}` : key);
  publish();
}
