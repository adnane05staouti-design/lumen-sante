import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, hashRecoveryCode, newRecoveryCodes, totpCode, verifyTotp } from "@/lib/totp";
import { hashToken, newCancelToken } from "@/lib/tokens";

// RFC 6238 appendix B, SHA-1, secret "12345678901234567890" (8 last digits of the reference values)
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("TOTP (RFC 6238)", () => {
  it("matches the reference vectors", () => {
    expect(totpCode(RFC_SECRET, Math.floor(59 / 30))).toBe("287082");
    expect(totpCode(RFC_SECRET, Math.floor(1111111109 / 30))).toBe("081804");
    expect(totpCode(RFC_SECRET, Math.floor(1234567890 / 30))).toBe("005924");
    expect(totpCode(RFC_SECRET, Math.floor(2000000000 / 30))).toBe("279037");
  });

  it("base32 round-trips", () => {
    const buf = Buffer.from("any secret bytes!");
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
  });

  it("accepts ±30 s of clock drift, refuses older codes and replays", () => {
    const now = 1_800_000_000_000;
    const step = Math.floor(now / 30_000);
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step), -1, now)).toBe(step);
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step - 1), -1, now)).toBe(step - 1);
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step - 3), -1, now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step), step, now)).toBeNull(); // already used
    expect(verifyTotp(RFC_SECRET, "12345", -1, now)).toBeNull();
  });

  it("recovery codes are unique and normalised before hashing", () => {
    const codes = newRecoveryCodes();
    expect(new Set(codes).size).toBe(8);
    expect(codes[0]).toMatch(/^[a-z2-7]{4}-[a-z2-7]{4}$/);
    expect(hashRecoveryCode(codes[0].toUpperCase().replace("-", " "))).toBe(hashRecoveryCode(codes[0]));
  });
});

describe("cancellation tokens", () => {
  it("only a fingerprint is stored, never the token", () => {
    const token = newCancelToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });
});

describe("secret encryption (AES-256-GCM)", () => {
  it("round-trips, never stores the secret in clear, and rejects tampering or another key", async () => {
    const { vi } = await import("vitest");
    vi.stubEnv("AUTH_SECRET", "k".repeat(48));
    const { encryptSecret, decryptSecret } = await import("@/lib/totp");
    const stored = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(stored).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(stored)).toBe("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(stored.slice(0, -2) + (stored.endsWith("A") ? "BB" : "AA"))).toBeNull();
    vi.stubEnv("AUTH_SECRET", "z".repeat(48));
    expect(decryptSecret(stored)).toBeNull();
    vi.unstubAllEnvs();
  });
});
