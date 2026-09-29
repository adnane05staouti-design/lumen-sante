import type { Metadata } from "next";
import "../globals.css";
import { getSite } from "@/lib/content";
import { fontVars } from "@/lib/fonts";

export async function generateMetadata(): Promise<Metadata> {
  const { identity } = await getSite();
  return { title: `Administration — ${identity.name}`, robots: { index: false, follow: false } };
}

export default async function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  const { identity } = await getSite();
  return (
    <html
      lang="fr"
      dir="ltr"
      className={fontVars}
      style={{ "--accent": identity.theme.accent, "--accent-2": identity.theme.accent2 } as React.CSSProperties}
    >
      <body className="min-h-screen bg-bg">{children}</body>
    </html>
  );
}
