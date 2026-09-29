import { Fragment } from "react";
import type { Locale } from "@/lib/i18n";
import { label } from "./labels";

const LANGS: { id: Locale; name: string; dir: "ltr" | "rtl" }[] = [
  { id: "fr", name: "Français", dir: "ltr" },
  { id: "en", name: "English", dir: "ltr" },
  { id: "ar", name: "العربية", dir: "rtl" },
];

/** Keys kept in the dictionaries for compatibility but no longer shown on the site. */
const HIDDEN = new Set(["center.eyebrow", "center.title", "center.stats"]);

const field =
  "mt-1 block w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent";

type Values = Record<Locale, unknown>;
const at = (v: unknown, key: string | number) => (v && typeof v === "object" ? (v as Record<string, unknown>)[key] : undefined);

/**
 * Generic editor for one dictionary section: every text is shown in the three languages.
 * The structure comes from the default French texts, the values from the current (merged) texts.
 */
export function TextFields({ path, values, shape }: { path: string; values: Values; shape: unknown }) {
  if (HIDDEN.has(path)) return null;

  if (typeof shape === "string") {
    const long = shape.length > 70;
    return (
      <div className="grid gap-2 border-b border-line py-4 last:border-0 xl:grid-cols-[200px_1fr_1fr_1fr] xl:gap-4">
        <p className="text-sm font-medium text-fg xl:pt-6">{label(path)}</p>
        {LANGS.map((l) => (
          <label key={l.id} className="block">
            <span className="text-[0.7rem] tracking-wide text-subtle uppercase">{l.name}</span>
            {long ? (
              <textarea name={`t|${path}|${l.id}`} defaultValue={String(values[l.id] ?? "")} dir={l.dir} rows={3} maxLength={1000} className={field} />
            ) : (
              <input name={`t|${path}|${l.id}`} defaultValue={String(values[l.id] ?? "")} dir={l.dir} maxLength={1000} className={field} />
            )}
          </label>
        ))}
      </div>
    );
  }

  if (Array.isArray(shape) && (shape.length === 0 || typeof shape[0] === "string")) {
    return (
      <div className="grid gap-2 border-b border-line py-4 last:border-0 xl:grid-cols-[200px_1fr_1fr_1fr] xl:gap-4">
        <p className="text-sm font-medium text-fg xl:pt-6">
          {label(path)}
          <span className="mt-1 block text-xs font-normal text-muted">Un élément par ligne</span>
        </p>
        {LANGS.map((l) => (
          <label key={l.id} className="block">
            <span className="text-[0.7rem] tracking-wide text-subtle uppercase">{l.name}</span>
            <textarea
              name={`l|${path}|${l.id}`}
              defaultValue={((values[l.id] as string[] | undefined) ?? []).join("\n")}
              dir={l.dir}
              rows={Math.min(8, Math.max(3, shape.length))}
              className={field}
            />
          </label>
        ))}
      </div>
    );
  }

  if (Array.isArray(shape)) {
    return (
      <>
        {shape.map((item, i) => (
          <div key={i} className="my-3 rounded-xl border border-line bg-bg/40 px-4">
            <p className="pt-3 text-xs tracking-wide text-accent uppercase">Élément {i + 1}</p>
            <TextFields
              path={`${path}.${i}`}
              shape={item}
              values={{ fr: at(values.fr, i), en: at(values.en, i), ar: at(values.ar, i) }}
            />
          </div>
        ))}
      </>
    );
  }

  if (shape && typeof shape === "object") {
    return (
      <>
        {Object.entries(shape).map(([key, sub]) => (
          <Fragment key={key}>
            <TextFields
              path={`${path}.${key}`}
              shape={sub}
              values={{ fr: at(values.fr, key), en: at(values.en, key), ar: at(values.ar, key) }}
            />
          </Fragment>
        ))}
      </>
    );
  }
  return null;
}
