"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit, bumpSessionVersion, clearMfaChallenge, createSession, readMfaChallenge, requireUser, verifyCredentials } from "@/lib/auth";
import { clientKey, isRateLimited } from "@/lib/rate-limit";
import { decryptSecret, encryptSecret, hashRecoveryCode, newRecoveryCodes, newTotpSecret, verifyTotp } from "@/lib/totp";
import type { FormState } from "./admin";

/**
 * Two-factor authentication (2FA) for the clinic staff:
 * password + 6-digit code from an authenticator app (or a single-use recovery code).
 */

const TOO_MANY = "Trop de tentatives. Réessayez dans 15 minutes.";
const code = (form: FormData) => String(form.get("code") ?? "").replace(/\s/g, "").slice(0, 20);

type UserRow = typeof schema.users.$inferSelect;

/** Checks a 6-digit code (never twice the same) or consumes a recovery code. */
async function checkSecondFactor(user: UserRow, input: string): Promise<"totp" | "recovery" | null> {
  if (/^\d{6}$/.test(input)) {
    const secret = user.totpSecret ? decryptSecret(user.totpSecret) : null;
    if (!secret) return null;
    const step = verifyTotp(secret, input, user.totpLastStep);
    if (step === null) return null;
    // atomic: two requests with the same code cannot both succeed
    const updated = await db
      .update(schema.users)
      .set({ totpLastStep: step })
      .where(sql`${schema.users.id} = ${user.id} and ${schema.users.totpLastStep} < ${step}`)
      .returning({ id: schema.users.id });
    return updated.length ? "totp" : null;
  }
  const hash = hashRecoveryCode(input);
  if (!user.recoveryCodes.includes(hash)) return null;
  // remove the code atomically: a recovery code works only once
  const updated = await db
    .update(schema.users)
    .set({ recoveryCodes: sql`${schema.users.recoveryCodes} - ${hash}::text` })
    .where(sql`${schema.users.id} = ${user.id} and ${schema.users.recoveryCodes} ? ${hash}`)
    .returning({ id: schema.users.id });
  return updated.length ? "recovery" : null;
}

/* ------------------------------------------------------------ login, step 2 */

export async function verifyLoginCode(_: FormState, form: FormData): Promise<FormState> {
  const user = await readMfaChallenge();
  if (!user) return { error: "Session expirée : reconnectez-vous avec votre mot de passe." };
  const ip = await clientKey();
  if ((await isRateLimited(`mfa:${user.id}`, 5, 900)) || (await isRateLimited(`mfa:ip:${ip}`, 20, 900))) return { mfa: true, error: TOO_MANY };
  const factor = await checkSecondFactor(user, code(form));
  if (!factor) {
    await audit(user.id, "login.mfa.failed", "");
    return { mfa: true, error: "Code incorrect." };
  }
  await clearMfaChallenge();
  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role, sessionVersion: user.sessionVersion, mfa: true });
  await audit(user.id, "login.success", factor === "recovery" ? "2FA (code de secours)" : "2FA");
  redirect("/admin");
}

export async function cancelLoginCode() {
  await clearMfaChallenge();
  redirect("/admin/login");
}

/* ---------------------------------------------------------------- set up */

/** Step 1: a new secret is generated (not active yet) and shown as a QR code on the account page. */
export async function startMfaSetup() {
  const me = await requireUser();
  if (me.mfa) return;
  await db.update(schema.users).set({ totpSecret: encryptSecret(newTotpSecret()), totpLastStep: 0 }).where(eq(schema.users.id, me.id));
  revalidatePath("/admin/compte");
}

/** Step 2: the first code proves the phone app is set up; 2FA is then enabled and recovery codes are shown once. */
export async function confirmMfaSetup(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireUser();
  if (await isRateLimited(`mfa-setup:${me.id}`, 5, 900)) return { error: TOO_MANY };
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, me.id) });
  if (!user || user.totpEnabled || !user.totpSecret) return { error: "Recommencez l'activation." };
  const secret = decryptSecret(user.totpSecret);
  const step = secret ? verifyTotp(secret, code(form), -1) : null;
  if (step === null) return { error: "Code incorrect : vérifiez l'heure de votre téléphone et réessayez." };
  const codes = newRecoveryCodes();
  await db
    .update(schema.users)
    .set({ totpEnabled: true, totpLastStep: step, recoveryCodes: codes.map(hashRecoveryCode) })
    .where(eq(schema.users.id, me.id));
  // no cookie change / revalidation here: the page must stay as it is so the recovery codes can be read
  // (to close older sessions too, the user can click "Me déconnecter partout")
  await audit(me.id, "user.mfa.enabled", "");
  return { ok: true, codes };
}

/** Turning 2FA off requires the password and a current code (a stolen session is not enough). */
export async function disableMfa(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireUser();
  if (await isRateLimited(`mfa-setup:${me.id}`, 5, 900)) return { error: TOO_MANY };
  if (!(await verifyCredentials(me.email, String(form.get("password") ?? "").slice(0, 200)))) return { error: "Mot de passe incorrect." };
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, me.id) });
  if (!user?.totpEnabled || !(await checkSecondFactor(user, code(form)))) return { error: "Code incorrect." };
  await db.update(schema.users).set({ totpEnabled: false, totpSecret: null, recoveryCodes: [] }).where(eq(schema.users.id, me.id));
  await audit(me.id, "user.mfa.disabled", "");
  revalidatePath("/admin/compte");
  return { ok: true };
}

/** New recovery codes (the old ones stop working). Requires a current code. */
export async function regenerateRecoveryCodes(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireUser();
  if (await isRateLimited(`mfa-setup:${me.id}`, 5, 900)) return { error: TOO_MANY };
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, me.id) });
  if (!user?.totpEnabled || (await checkSecondFactor(user, code(form))) !== "totp") return { error: "Code incorrect." };
  const codes = newRecoveryCodes();
  await db.update(schema.users).set({ recoveryCodes: codes.map(hashRecoveryCode) }).where(eq(schema.users.id, me.id));
  await audit(me.id, "user.mfa.codes", "");
  return { ok: true, codes };
}

/** An administrator removes the 2FA of another account (lost phone and no recovery code). Sessions are closed. */
export async function resetUserMfa(id: string) {
  const me = await requireUser("ADMIN");
  if (!z.string().uuid().safeParse(id).success || id === me.id) return;
  const target = await db.query.users.findFirst({ where: eq(schema.users.id, id), columns: { email: true } });
  if (!target) return;
  await db.update(schema.users).set({ totpEnabled: false, totpSecret: null, recoveryCodes: [] }).where(eq(schema.users.id, id));
  await bumpSessionVersion(id);
  await audit(me.id, "user.mfa.reset", target.email);
  revalidatePath("/admin/parametres");
}
