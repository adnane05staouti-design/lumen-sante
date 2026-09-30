/**
 * Rate-limit key of a client address.
 *  - IPv4 (and IPv4-mapped IPv6 "::ffff:1.2.3.4"): the full address;
 *  - IPv6: the /64 network, computed on the expanded address, so every way of writing
 *    the same network ("2001:db8::1", "2001:0db8:0:0::2", upper/lower case) gives the same key.
 *    One IPv6 subscriber owns a whole /64: counting per address could be bypassed by rotating.
 */
export function networkKey(raw: string): string {
  const ip = raw.trim().replace(/^\[|\]$/g, "").split("%")[0].toLowerCase();
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1];
  if (!ip.includes(":")) return ip || "unknown";
  const groups = expandIPv6(ip);
  return groups ? `${groups.slice(0, 4).join(":")}::/64` : "invalid-ipv6";
}

function expandIPv6(ip: string): string[] | null {
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const parse = (part: string) => (part ? part.split(":") : []);
  const head = parse(halves[0]);
  const tail = halves.length === 2 ? parse(halves[1]) : [];
  // an embedded IPv4 at the end counts for two groups
  const last = tail.length ? tail : head;
  if (last.length && last[last.length - 1].includes(".")) {
    const v4 = last.pop()!.split(".").map(Number);
    if (v4.length !== 4 || v4.some((n) => !(n >= 0 && n <= 255))) return null;
    last.push(((v4[0] << 8) | v4[1]).toString(16), ((v4[2] << 8) | v4[3]).toString(16));
  }
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => g.padStart(4, "0"));
}
