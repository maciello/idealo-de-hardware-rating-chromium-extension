import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createCandidateIndex, isModelNumberLike, tokenize } from "../../src/candidates";

interface Named {
  readonly name: string;
}

const named = (...names: readonly string[]): Named[] => names.map((name) => ({ name }));
const nameOf = (r: Named): string => r.name;
const namesFor = (
  index: ReturnType<typeof createCandidateIndex<Named>>,
  text: string,
  limit?: number,
) =>
  index.candidatesFor(text, limit === undefined ? undefined : { limit }).map((c) => c.record.name);

describe("tokenize", () => {
  it("splits on space, hyphen and underscore but keeps model-number tokens whole", () => {
    expect(tokenize("Intel Core i7-13700H")).toEqual(["intel", "core", "i7", "13700h"]);
    expect(tokenize("AMD Ryzen AI Max+ 395")).toEqual(["amd", "ryzen", "ai", "max+", "395"]);
    expect(tokenize("Ryzen 9 7950X3D")).toEqual(["ryzen", "9", "7950x3d"]);
    expect(tokenize("Core_Ultra 9 275HX")).toEqual(["core", "ultra", "9", "275hx"]);
  });

  it("drops clock speeds and trademark marks", () => {
    expect(tokenize("Intel(R) Core(TM) i7-4770 @ 3.40GHz")).toEqual([
      "intel",
      "core",
      "i7",
      "4770",
    ]);
    expect(tokenize("Intel® Core™ i5-12400F 2.5 GHz")).toEqual(["intel", "core", "i5", "12400f"]);
  });

  it("drops punctuation tokens such as a lone plus or ampersand", () => {
    expect(tokenize('14" Tablet & Laptop + more')).toEqual(["14", "tablet", "laptop", "more"]);
  });
});

describe("isModelNumberLike", () => {
  it.each(["395", "275hx", "x3d", "13700h", "7950x3d", "rtx4060"])("accepts %s", (token) => {
    expect(isModelNumberLike(token)).toBe(true);
  });
  it.each(["max+", "ryzen", "14", "7", "16gb", "3200mhz", "ddr5", "gddr6x"])(
    "rejects %s",
    (token) => {
      expect(isModelNumberLike(token)).toBe(false);
    },
  );
});

describe("createCandidateIndex", () => {
  const index = createCandidateIndex(
    named(
      "AMD Ryzen AI Max+ 395",
      "AMD Ryzen AI Max+ Pro 395",
      "AMD Ryzen AI Max 390",
      "AMD Ryzen 7 8845HS",
      "AMD Ryzen 7 PRO 8845HS",
      "AMD Ryzen 9 8945HS",
      "Intel Core Ultra 9 275HX",
      "Intel Core Ultra 7 265HX",
      "Intel Core i7-13700H",
      "Intel Core i7-13700HX",
    ),
    { nameOf },
  );

  it("seeds on the rarest model number and ranks the specific record first", () => {
    const title = 'OneXPlayer Super X 14" Tablet & Laptop 2-In-1 AI MAX+ 395 Water Cooled Version';
    expect(namesFor(index, title)).toEqual(["AMD Ryzen AI Max+ 395", "AMD Ryzen AI Max+ Pro 395"]);
  });

  it("does not let a near-miss model number into the list", () => {
    expect(namesFor(index, "Ryzen AI Max+ 395")).not.toContain("AMD Ryzen AI Max 390");
    expect(namesFor(index, "Intel Core i7-13700H")).toEqual(["Intel Core i7-13700H"]);
  });

  it("ignores unit and spec tokens when picking the seed", () => {
    expect(namesFor(index, "Ryzen 7 8845HS 16GB")).toEqual([
      "AMD Ryzen 7 8845HS",
      "AMD Ryzen 7 PRO 8845HS",
    ]);
  });

  it("falls back to every record sharing a token when the query has no model number", () => {
    const names = namesFor(index, "Ryzen AI Max");
    expect(names[0]).toBe("AMD Ryzen AI Max 390");
    expect(names.length).toBeGreaterThan(3);
  });

  it("returns scores that never increase down the list", () => {
    const scores = index.candidatesFor("AMD Ryzen 7 8845HS").map((c) => c.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(scores.every((s) => s > 0)).toBe(true);
  });

  it("returns nothing for text that shares no token with the index", () => {
    expect(index.candidatesFor("completely unrelated words")).toEqual([]);
    expect(index.candidatesFor("")).toEqual([]);
  });

  it("honours the limit, including zero", () => {
    expect(namesFor(index, "Ryzen AI Max", 2)).toHaveLength(2);
    expect(namesFor(index, "Ryzen AI Max", 0)).toEqual([]);
  });

  it("is generic over the record type", () => {
    const gpus = createCandidateIndex(
      [
        { id: 1, label: "GeForce RTX 5080" },
        { id: 2, label: "GeForce RTX 5080 Laptop GPU" },
      ],
      { nameOf: (g) => g.label },
    );
    expect(gpus.candidatesFor("RTX 5080 Laptop").map((c) => c.record.id)).toEqual([2, 1]);
  });
});

/** Words that look like real names: letters, digits, a few with a plus or glued model numbers. */
const word = fc.oneof(
  fc.constantFrom("amd", "intel", "ryzen", "core", "ultra", "pro", "max+", "ai", "mobile", "gpu"),
  fc.stringMatching(/^[a-z]{1,2}[0-9]{2,4}[a-z]{0,2}$/),
  fc.stringMatching(/^[0-9]{1,4}$/),
);
const nameArb = fc
  .tuple(fc.array(word, { minLength: 1, maxLength: 6 }), fc.constantFrom(" ", "-", "_"))
  .map(([parts, separator]) => parts.join(separator));
const recordsArb = fc
  .uniqueArray(nameArb, { minLength: 1, maxLength: 40 })
  .map((names) => names.map((name, id) => ({ id, name })));

describe("createCandidateIndex properties", () => {
  const nameField = (r: { name: string }): string => r.name;

  it("is deterministic and independent of record order when names are unique", () => {
    fc.assert(
      fc.property(recordsArb, fc.string({ maxLength: 40 }), (records, text) => {
        const first = createCandidateIndex(records, { nameOf: nameField }).candidatesFor(text);
        const again = createCandidateIndex(records, { nameOf: nameField }).candidatesFor(text);
        expect(again).toEqual(first);
        const reversed = createCandidateIndex([...records].reverse(), { nameOf: nameField });
        expect(reversed.candidatesFor(text).map((c) => c.record.id)).toEqual(
          first.map((c) => c.record.id),
        );
      }),
    );
  });

  it("never exceeds the limit (default 254)", () => {
    fc.assert(
      fc.property(
        recordsArb,
        fc.string({ maxLength: 40 }),
        fc.integer({ min: 0, max: 50 }),
        (records, text, limit) => {
          const index = createCandidateIndex(records, { nameOf: nameField });
          expect(index.candidatesFor(text, { limit }).length).toBeLessThanOrEqual(limit);
          expect(index.candidatesFor(text).length).toBeLessThanOrEqual(254);
        },
      ),
    );
  });

  it("ranks the exact record first when the query equals a record name", () => {
    fc.assert(
      fc.property(recordsArb, fc.nat(), (records, pick) => {
        const target = records[pick % records.length] as { id: number; name: string };
        const index = createCandidateIndex(records, { nameOf: nameField });
        const [top] = index.candidatesFor(target.name);
        expect(top?.record.id).toBe(target.id);
      }),
    );
  });

  it("returns more than 254 records capped at 254 for a large shared-token index", () => {
    const records = Array.from({ length: 400 }, (_, id) => ({
      id,
      name: `Testcorp Chip ${1000 + id}`,
    }));
    const index = createCandidateIndex(records, { nameOf: nameField });
    expect(index.candidatesFor("Testcorp Chip").length).toBe(254);
  });
});
