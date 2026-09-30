import { describe, expect, it } from "vitest";
import { networkKey } from "@/lib/ip";

describe("networkKey (rate limiting)", () => {
  it("keeps IPv4 addresses whole", () => {
    expect(networkKey("41.250.12.7")).toBe("41.250.12.7");
    expect(networkKey("::ffff:41.250.12.7")).toBe("41.250.12.7");
  });
  it("groups every writing of the same IPv6 /64", () => {
    const key = "2001:0db8:0000:0000::/64";
    for (const ip of ["2001:db8::1", "2001:DB8:0:0:ffff::2", "2001:0db8:0000:0000:1:2:3:4", "[2001:db8::5]", "2001:db8::6%eth0"]) {
      expect(networkKey(ip), ip).toBe(key);
    }
    expect(networkKey("2001:db8:0:1::1")).not.toBe(key); // another /64
    expect(networkKey("::1")).toBe("0000:0000:0000:0000::/64");
  });
  it("never crashes on garbage", () => {
    expect(networkKey("1:2:3::4::5")).toBe("invalid-ipv6");
    expect(networkKey("zzzz::1")).toBe("invalid-ipv6");
    expect(networkKey("")).toBe("unknown");
  });
});
