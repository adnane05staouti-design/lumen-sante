/**
 * Error details that are safe to log: never the SQL parameters (they contain patient data)
 * nor the cancellation tokens. Only the error type, the PostgreSQL code and the first line of the message.
 */
export function safeError(error: unknown): string {
  const e = error as { name?: string; message?: string; code?: string; cause?: { code?: string; message?: string } };
  const code = e?.code ?? e?.cause?.code;
  const message = (e?.cause?.message ?? e?.message ?? String(error)).split("\n")[0].replace(/params:.*$/i, "").slice(0, 200);
  return `${e?.name ?? "Error"}${code ? ` [${code}]` : ""}: ${message}`;
}
