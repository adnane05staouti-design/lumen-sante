import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it("accepts the usual Moroccan formats and stores +212…", () => {
    for (const input of ["06 12 34 56 78", "0612345678", "+212 6 12 34 56 78", "00212612345678", "(+212) 612-345-678"]) {
      expect(normalizePhone(input), input).toBe("+212612345678");
    }
    expect(normalizePhone("05 22 00 00 00")).toBe("+212522000000");
  });
  it("accepts international numbers written with + or 00", () => {
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("+33612345678");
    expect(normalizePhone("0033612345678")).toBe("+33612345678");
  });
  it("refuses numbers that cannot be valid", () => {
    for (const input of ["123", "0812345678", "+212 8 12 34 56 78", "06123", "abc0612345678", "612345678", "+0123456789"]) {
      expect(normalizePhone(input), input).toBeNull();
    }
  });
});
