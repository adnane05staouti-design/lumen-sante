/**
 * Phone numbers: accepts the usual ways of typing a number and stores one standard form (E.164),
 * so a clinic can call back or send reminders without errors.
 *   "06 12 34 56 78" / "0612345678" / "+212 6 12 34 56 78" / "00212612345678" → "+212612345678"
 *   foreign numbers must start with + or 00: "+33 6 12 34 56 78" → "+33612345678"
 * Returns null when the number cannot be valid.
 */
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  if (!/^\(?\+?[0-9 ().-]{6,25}$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (raw.replace(/^\(/, "").startsWith("+")) digits = `+${digits}`;
  else if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  else if (/^0[5-7]\d{8}$/.test(digits)) digits = `+212${digits.slice(1)}`; // Moroccan national format
  else return null;
  if (digits.startsWith("+212")) return /^\+212[5-7]\d{8}$/.test(digits) ? digits : null; // landline 05, mobile 06/07
  return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null; // E.164: 8 to 15 digits
}
