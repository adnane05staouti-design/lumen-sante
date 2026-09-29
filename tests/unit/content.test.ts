import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/db", () => ({ db: {}, schema: {} }));

const { deepMerge } = await import("@/lib/content");
const { safeError } = await import("@/lib/log");

describe("deepMerge (CMS values over defaults)", () => {
  const base = { title: "Titre", list: ["a", "b"], steps: [{ t: "1", d: "x" }], n: 3 };

  it("keeps defaults for missing or empty values", () => {
    expect(deepMerge(base, { title: "  " })).toEqual(base);
    expect(deepMerge(base, undefined)).toEqual(base);
  });
  it("replaces strings, lists and numbers", () => {
    const out = deepMerge(base, { title: "Nouveau", list: ["c"], n: 5 });
    expect(out).toMatchObject({ title: "Nouveau", list: ["c"], n: 5 });
  });
  it("ignores values of the wrong type and unknown keys", () => {
    const out = deepMerge(base, { title: 42, n: "x", extra: "hack" } as never);
    expect(out).toEqual(base);
    expect("extra" in out).toBe(false);
  });
  it("merges lists of objects item by item", () => {
    expect(deepMerge(base, { steps: [{ t: "A" }] }).steps).toEqual([{ t: "A", d: "x" }]);
  });
  it("cannot pollute Object.prototype", () => {
    deepMerge(base, JSON.parse('{"__proto__": {"polluted": true}}'));
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("safeError (logs never contain patient data)", () => {
  it("drops SQL parameters", () => {
    const e = Object.assign(new Error('Failed query: insert into appointments ... params: Jane Doe,+212600000000,jane@x.ma'), { code: "23502" });
    const out = safeError(e);
    expect(out).not.toContain("Jane");
    expect(out).not.toContain("jane@x.ma");
    expect(out).toContain("23502");
  });
});
