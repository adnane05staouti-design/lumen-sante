import { createHash, randomBytes } from "node:crypto";

/**
 * Cancellation links: the patient receives a random token (192 bits) by e-mail;
 * the database only keeps its SHA-256 fingerprint. A leak of the database therefore
 * does not allow anyone to cancel appointments.
 */
export const newCancelToken = () => randomBytes(24).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");
