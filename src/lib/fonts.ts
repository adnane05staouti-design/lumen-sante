import localFont from "next/font/local";

/**
 * Self-hosted variable fonts through next/font: preloaded, with a metric-matched fallback
 * (no layout shift when the real font arrives). Files come from @fontsource packages.
 */
export const displayFont = localFont({
  src: "../../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-sg",
  weight: "300 700",
  display: "swap",
});

export const bodyFont = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const fontVars = `${displayFont.variable} ${bodyFont.variable}`;
