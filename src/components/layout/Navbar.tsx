"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/ui/Logo";
import type { Dictionary } from "@/dictionaries";
import { locales, type Locale } from "@/lib/i18n";
import { Magnetic } from "@/components/fx/Magnetic";

const langLabel: Record<Locale, string> = { fr: "FR", ar: "ع", en: "EN" };

export function Navbar({ locale, t, brand }: { locale: Locale; t: Dictionary["nav"]; brand: { name: string; logo: string | null } }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: `/${locale}#specialites`, label: t.specialties },
    { href: `/${locale}#centre`, label: t.center },
    { href: `/${locale}/medecins`, label: t.doctors },
    { href: `/${locale}#contact`, label: t.contact },
  ];
  const switchTo = (l: Locale) => pathname.replace(/^\/(fr|ar|en)(?=\/|$)/, `/${l}`);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "border-b border-line bg-bg/70 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <nav className="container-x flex h-20 items-center justify-between">
        <Link href={`/${locale}`} className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
          <LogoMark logo={brand.logo} />
          {brand.name}
        </Link>

        <div className="hidden items-center gap-9 text-sm text-muted lg:flex">
          {links.map((l) => {
            const cls = "group relative py-1 transition-colors hover:text-fg";
            const inner = (
              <>
                {l.label}
                <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-accent to-accent-2 transition-transform duration-500 group-hover:scale-x-100 rtl:origin-right" />
              </>
            );
            return l.href.includes("#") ? (
              <a key={l.href} href={l.href} className={cls}>{inner}</a>
            ) : (
              <Link key={l.href} href={l.href} className={cls}>{inner}</Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-5 lg:flex">
          <div className="flex items-center gap-1 rounded-full border border-line p-1 text-xs">
            {locales.map((l) => (
              <Link
                key={l}
                href={switchTo(l)}
                aria-current={l === locale ? "true" : undefined}
                className={`rounded-full px-2.5 py-1 transition-colors ${
                  l === locale ? "bg-fg text-bg" : "text-muted hover:text-fg"
                }`}
              >
                {langLabel[l]}
              </Link>
            ))}
          </div>
          <Magnetic strength={0.25}>
            <Link
              href={`/${locale}/rendez-vous`}
              className="block rounded-xl bg-fg px-5 py-3 text-sm font-semibold text-bg transition-shadow hover:shadow-[0_0_40px_-8px_var(--accent)]"
            >
              {t.book}
            </Link>
          </Magnetic>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid size-11 place-items-center rounded-xl border border-line lg:hidden"
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-t border-line bg-bg/95 backdrop-blur-xl lg:hidden"
          >
            <div className="container-x flex flex-col gap-1 py-5">
              {links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-2 py-3 text-lg">
                  {l.label}
                </a>
              ))}
              <div className="mt-3 flex gap-2">
                {locales.map((l) => (
                  <Link
                    key={l}
                    href={switchTo(l)}
                    className={`rounded-full border px-4 py-2 text-sm ${l === locale ? "border-fg bg-fg text-bg" : "border-line text-muted"}`}
                  >
                    {langLabel[l]}
                  </Link>
                ))}
              </div>
              <Link
                href={`/${locale}/rendez-vous`}
                onClick={() => setOpen(false)}
                className="mt-4 rounded-xl bg-fg px-5 py-4 text-center font-semibold text-bg"
              >
                {t.book}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
