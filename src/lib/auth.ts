import "server-only";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, schema } from "@/db";

export const SESSION_COOKIE = "lumen_session";
const SESSION_HOURS = 8;

export type SessionUser = { id: string; name: string; email: string; role: "ADMIN" | "STAFF"; sessionVersion: number };

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be set (at least 32 characters).");
  return new TextEncoder().encode(value);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

/** Checks credentials. Always runs bcrypt, even for unknown e-mails, so response time reveals nothing. */
export async function verifyCredentials(email: string, password: string): Promise<SessionUser | null> {
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email.toLowerCase()) });
  const hash = user?.passwordHash ?? "$2b$12$D2ekwBxhpK9UYFONxbbGFe8gpC783xYj1zIz33CqJhzLDv8CiR4Aq";
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok || !user.active) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role, sessionVersion: user.sessionVersion };
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ sv: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

/** Logs out. With `revoke`, every session of this user (other devices, stolen cookie) is invalidated too. */
export async function destroySession(revoke = false) {
  if (revoke) {
    const user = await getSession();
    if (user) await bumpSessionVersion(user.id);
  }
  (await cookies()).delete(SESSION_COOKIE);
}

export async function bumpSessionVersion(userId: string) {
  await db
    .update(schema.users)
    .set({ sessionVersion: sql`${schema.users.sessionVersion} + 1` })
    .where(eq(schema.users.id, userId));
}

/**
 * Current user, re-checked in the database (a disabled account loses access at once).
 * Memoized per request: layout + page + actions share one lookup.
 */
export const getSession = cache(async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, payload.sub) });
    if (!user || !user.active || payload.sv !== user.sessionVersion) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role, sessionVersion: user.sessionVersion };
  } catch {
    return null;
  }
});

/** Use at the top of every admin page and action. */
export async function requireUser(role?: "ADMIN"): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  if (role === "ADMIN" && user.role !== "ADMIN") redirect("/admin");
  return user;
}

export async function audit(userId: string | null, action: string, detail = "") {
  await db.insert(schema.auditLogs).values({ userId, action, detail: detail.slice(0, 500) });
}
