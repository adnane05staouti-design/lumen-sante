import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, RotateCcw, Trash2 } from "lucide-react";
import {
  addGalleryPhoto,
  deleteGalleryPhoto,
  moveGalleryPhoto,
  resetContent,
  saveGalleryCaptions,
  saveIdentity,
  saveSpecialtyTexts,
  saveStats,
  saveTexts,
} from "@/app/actions/content";
import { clinic, type SpecialtyId } from "@/config/clinic";
import { getDictionary } from "@/dictionaries";
import { requireUser } from "@/lib/auth";
import { getSite, getTexts } from "@/lib/content";
import { ActionForm, Field, inputCls } from "@/components/admin/ActionForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ImageInput } from "@/components/admin/ImageInput";
import { Card, PageTitle } from "@/components/admin/ui";
import { SpecialtyIcon } from "@/components/ui/SpecialtyIcon";
import { SECTION_TITLE, TABS } from "./labels";
import { TextFields } from "./TextFields";

export const dynamic = "force-dynamic";

const LANGS = [
  { id: "fr", name: "Français", dir: "ltr" },
  { id: "en", name: "English", dir: "ltr" },
  { id: "ar", name: "العربية", dir: "rtl" },
] as const;

const small = "mt-1 block w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm outline-none focus:border-accent";

function ResetButton({ action, what }: { action: () => Promise<void>; what: string }) {
  return (
    <form action={action}>
      <ConfirmButton
        message={`Rétablir ${what} d'origine ? Vos modifications seront perdues.`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:border-line-strong hover:text-fg"
      >
        <RotateCcw size={13} /> Rétablir l&apos;original
      </ConfirmButton>
    </form>
  );
}

export default async function ContentAdmin({ searchParams }: PageProps<"/admin/contenu">) {
  await requireUser("ADMIN");
  const tabParam = (await searchParams).tab;
  const tab = TABS.find((t) => t.id === tabParam) ?? TABS[0];
  const [site, fr, en, ar] = await Promise.all([getSite(), getTexts("fr"), getTexts("en"), getTexts("ar")]);
  const shape = getDictionary("fr");
  const current = { fr, en, ar } as const;

  return (
    <>
      <PageTitle title="Contenu du site" lead="Textes, photos, logo et couleurs, en français, anglais et arabe. Les changements sont visibles immédiatement.">
        <Link href="/fr" target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg">
          <ExternalLink size={15} /> Voir le site
        </Link>
      </PageTitle>

      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/contenu?tab=${t.id}`}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm transition-colors ${t.id === tab.id ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* ------------------------------------------------ identity */}
      {tab.id === "identite" && (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold">Identité du cabinet</h2>
            <ResetButton action={resetContent.bind(null, "identity", undefined)} what="l'identité" />
          </div>
          <ActionForm action={saveIdentity} submit="Enregistrer l'identité" className="mt-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Nom du cabinet">
                <input name="name" defaultValue={site.identity.name} maxLength={60} required className={inputCls} />
              </Field>
              <div>
                <ImageInput name="logo" label="Logo (carré, PNG transparent conseillé)" current={site.identity.logo ? `/media/${site.identity.logo}` : null} maxSide={512} />
                {site.identity.logo && (
                  <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                    <input type="checkbox" name="removeLogo" className="accent-[var(--accent)]" /> Retirer le logo (revenir au symbole par défaut)
                  </label>
                )}
              </div>
              <Field label="Téléphone">
                <input name="phone" defaultValue={site.identity.phone} maxLength={40} className={inputCls} dir="ltr" />
              </Field>
              <Field label="WhatsApp">
                <input name="whatsapp" defaultValue={site.identity.whatsapp} maxLength={40} className={inputCls} dir="ltr" />
              </Field>
              <Field label="E-mail de contact">
                <input name="email" type="email" defaultValue={site.identity.email} maxLength={120} className={inputCls} dir="ltr" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Horaires lundi – vendredi">
                  <input name="weekdays" defaultValue={site.identity.hours.weekdays} maxLength={40} className={inputCls} dir="ltr" />
                </Field>
                <Field label="Horaires samedi">
                  <input name="saturday" defaultValue={site.identity.hours.saturday} maxLength={40} className={inputCls} dir="ltr" />
                </Field>
              </div>
            </div>
            <p className="mt-6 text-sm font-medium">Adresse</p>
            <div className="mt-1 grid gap-3 md:grid-cols-3">
              {LANGS.map((l) => (
                <label key={l.id} className="block">
                  <span className="text-[0.7rem] tracking-wide text-subtle uppercase">{l.name}</span>
                  <input name={`address|${l.id}`} defaultValue={site.identity.address[l.id]} dir={l.dir} maxLength={200} className={small} />
                </label>
              ))}
            </div>
            <p className="mt-6 text-sm font-medium">Couleurs de la marque</p>
            <div className="mt-2 flex flex-wrap gap-6">
              {(["accent", "accent2"] as const).map((k, i) => (
                <label key={k} className="flex items-center gap-3 text-sm text-muted">
                  <input type="color" name={k} defaultValue={site.identity.theme[k]} className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-bg-2" />
                  {i === 0 ? "Couleur principale" : "Couleur secondaire"}
                </label>
              ))}
            </div>
          </ActionForm>
        </Card>
      )}

      {/* ------------------------------------------------ specialties */}
      {tab.id === "specialites" && (
        <Card className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold">Textes de chaque spécialité</h2>
            <ResetButton action={resetContent.bind(null, "specialties", undefined)} what="les textes des spécialités" />
          </div>
          <p className="mt-1 text-sm text-muted">
            Durée et activation : page <Link href="/admin/specialites" className="text-accent">Spécialités</Link>.
          </p>
          <ActionForm action={saveSpecialtyTexts} submit="Enregistrer les spécialités" className="mt-4">
            {(clinic.specialties as SpecialtyId[]).map((id) => {
              const s = site.specialties[id];
              return (
                <div key={id} className="mb-4 rounded-xl border border-line bg-bg/40 p-4">
                  <p className="flex items-center gap-2 font-display font-semibold">
                    <SpecialtyIcon id={id} size={18} className="text-accent" /> {s.name.fr}
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {LANGS.map((l) => (
                      <div key={l.id} className="space-y-2">
                        <span className="text-[0.7rem] tracking-wide text-subtle uppercase">{l.name}</span>
                        <input name={`${id}|name|${l.id}`} defaultValue={s.name[l.id]} dir={l.dir} maxLength={60} className={small} aria-label="Nom" />
                        <textarea name={`${id}|short|${l.id}`} defaultValue={s.short[l.id]} dir={l.dir} rows={2} maxLength={300} className={small} aria-label="Description" />
                        <textarea
                          name={`${id}|services|${l.id}`}
                          defaultValue={s.services[l.id].join("\n")}
                          dir={l.dir}
                          rows={4}
                          className={small}
                          aria-label="Prestations, une par ligne"
                          placeholder="Prestations (une par ligne)"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </ActionForm>
        </Card>
      )}

      {/* ------------------------------------------------ gallery */}
      {tab.id === "centre" && (
        <Card className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold">Photos du centre</h2>
            <ResetButton action={resetContent.bind(null, "gallery", undefined)} what="les photos" />
          </div>
          <p className="mt-1 text-sm text-muted">La première photo s&apos;affiche en grand. 9 photos maximum.</p>

          <ActionForm action={saveGalleryCaptions} submit="Enregistrer les légendes" className="mt-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {site.gallery.map((g, i) => (
                <div key={`${g.src}-${i}`} className="overflow-hidden rounded-xl border border-line bg-bg/40">
                  <div className="relative aspect-[16/10]">
                    <Image src={g.src} alt={g.caption.fr} fill sizes="400px" className="object-cover" />
                    <span className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white">{i + 1}</span>
                  </div>
                  <div className="space-y-2 p-3">
                    {LANGS.map((l) => (
                      <input key={l.id} name={`${i}|${l.id}`} defaultValue={g.caption[l.id]} dir={l.dir} maxLength={60} className={small} aria-label={`Légende ${l.name}`} placeholder={`Légende (${l.name})`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ActionForm>

          {/* order / delete: separate small forms (a form cannot be nested in another) */}
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {site.gallery.map((g, i) => (
              <div key={`actions-${g.src}-${i}`} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                <span className="truncate text-muted">
                  {i + 1}. {g.caption.fr || "Sans légende"}
                </span>
                <div className="flex gap-1">
                  <form action={moveGalleryPhoto.bind(null, i, -1)}>
                    <button disabled={i === 0} className="grid size-8 place-items-center rounded-md hover:bg-surface-2 disabled:opacity-30" aria-label="Monter">
                      <ArrowUp size={15} />
                    </button>
                  </form>
                  <form action={moveGalleryPhoto.bind(null, i, 1)}>
                    <button disabled={i === site.gallery.length - 1} className="grid size-8 place-items-center rounded-md hover:bg-surface-2 disabled:opacity-30" aria-label="Descendre">
                      <ArrowDown size={15} />
                    </button>
                  </form>
                  <form action={deleteGalleryPhoto.bind(null, i)}>
                    <ConfirmButton message="Supprimer cette photo ?" className="grid size-8 place-items-center rounded-md text-red-300 hover:bg-red-500/10">
                      <Trash2 size={15} />
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            ))}
          </div>

          {site.gallery.length < 9 && (
            <ActionForm action={addGalleryPhoto} submit="Ajouter la photo" className="mt-6 rounded-xl border border-dashed border-line-strong p-4" success="Photo ajoutée.">
              <p className="mb-3 text-sm font-medium">Ajouter une photo</p>
              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <ImageInput name="photo" label="Photo (paysage conseillé)" />
                <div className="space-y-2">
                  {LANGS.map((l) => (
                    <input key={l.id} name={`caption|${l.id}`} dir={l.dir} maxLength={60} className={small} placeholder={`Légende (${l.name})`} aria-label={`Légende ${l.name}`} />
                  ))}
                </div>
              </div>
            </ActionForm>
          )}
        </Card>
      )}

      {/* ------------------------------------------------ stats */}
      {tab.id === "chiffres" && (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold">Chiffres clés</h2>
            <ResetButton action={resetContent.bind(null, "stats", undefined)} what="les chiffres" />
          </div>
          <p className="mt-1 text-sm text-muted">Les nombres de médecins et de spécialités sont comptés automatiquement.</p>
          <ActionForm action={saveStats} submit="Enregistrer les chiffres" className="mt-5">
            <div className="grid gap-4 md:grid-cols-2">
              {site.stats.map((s, i) => (
                <div key={i} className="rounded-xl border border-line bg-bg/40 p-4">
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Avant">
                      <input name={`${i}|prefix`} defaultValue={s.prefix} maxLength={6} className={inputCls} />
                    </Field>
                    <Field label="Nombre">
                      {s.live ? (
                        <input disabled value="auto" className={inputCls + " opacity-60"} />
                      ) : (
                        <input name={`${i}|value`} type="number" min={0} defaultValue={s.value} className={inputCls} />
                      )}
                    </Field>
                    <Field label="Après">
                      <input name={`${i}|suffix`} defaultValue={s.suffix} maxLength={6} className={inputCls} />
                    </Field>
                  </div>
                  <div className="mt-3 space-y-2">
                    {LANGS.map((l) => (
                      <input key={l.id} name={`${i}|label|${l.id}`} defaultValue={s.label[l.id]} dir={l.dir} maxLength={40} className={small} aria-label={`Libellé ${l.name}`} placeholder={`Libellé (${l.name})`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ActionForm>
        </Card>
      )}

      {/* ------------------------------------------------ generic text sections */}
      {tab.texts.map((section) => (
        <Card key={section} className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold">{SECTION_TITLE[section] ?? section}</h2>
            <ResetButton action={resetContent.bind(null, "texts", section)} what="ces textes" />
          </div>
          <ActionForm action={saveTexts.bind(null, section)} submit="Enregistrer" className="mt-2">
            <TextFields
              path={section}
              shape={shape[section as keyof typeof shape]}
              values={{
                fr: current.fr[section as keyof typeof fr],
                en: current.en[section as keyof typeof en],
                ar: current.ar[section as keyof typeof ar],
              }}
            />
          </ActionForm>
        </Card>
      ))}
    </>
  );
}
