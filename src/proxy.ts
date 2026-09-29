import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales, type Locale } from "@/lib/i18n";

const SESSION_COOKIE = "lumen_session";

function preferredLocale(request: NextRequest): Locale {
  const header = request.headers.get("accept-language") ?? "";
  const tags = header.split(",").map((p) => p.trim().slice(0, 2).toLowerCase());
  return (tags.find((t) => (locales as readonly string[]).includes(t)) as Locale) ?? defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Back office: quick gate on the session cookie (the real check happens on the server, in every page and action)
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname !== "/admin/login" && !request.cookies.has(SESSION_COOKIE)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return;
  }
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;
  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

// /media = uploaded images (never localized, never behind the admin gate)
export const config = { matcher: ["/((?!_next|api|media|.*\\..*).*)"] };
