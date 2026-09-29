export const locales = ["fr", "ar", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";
export const hasLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);
export const dirOf = (locale: Locale) => (locale === "ar" ? "rtl" : "ltr");
export type Localized<T = string> = Record<Locale, T>;
