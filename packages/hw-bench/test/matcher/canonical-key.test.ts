import { describe, expect, it } from "vitest";
import { passmarkCpuSource } from "../../src/benchmark";
import { extractCpuIdentity } from "../../src/identity";
import { createCanonicalKeyMatcher } from "../../src/matcher";
import { asJson, cpuRow, cpuSnapshotOf, namedCpus } from "../fixtures";

const nameOf = (result: ReturnType<ReturnType<typeof createCanonicalKeyMatcher>["match"]>) =>
  result.status === "matched" ? result.record.name : result.status;

describe("createCanonicalKeyMatcher", () => {
  const matcher = createCanonicalKeyMatcher(
    namedCpus(
      "Intel Core i7-13700H",
      "Intel Core i7-13700HX",
      "Intel Core i5-1335U",
      "Intel Core i5-1335UE",
      "AMD Ryzen 5 7600X",
      "AMD Ryzen 5 7600X3D",
      "AMD Ryzen 7 7840HS",
      "Intel Core i7-4770 @ 3.40GHz",
      "Intel Core i7-4770K @ 3.50GHz",
      "Apple M3 Pro 11 Core",
      "Apple M3 Pro 12 Core",
      "Apple M4 8 Core",
      "Apple M4 10 Core",
      "Apple M1 8 Core 3200 MHz",
      "Qualcomm Snapdragon X Elite - X1E-78-100",
      "Snapdragon X Elite - X1E78100 - Qualcomm Oryon",
      "Intel Core Ultra 7 155H",
      "Intel N100",
      "Intel Xeon E5-2680 v4 @ 2.40GHz",
    ),
  );

  it("matches the exact PassMark name as 'exact'", () => {
    expect(matcher.match("Intel Core i7-13700H")).toMatchObject({
      status: "matched",
      via: "exact",
      record: { name: "Intel Core i7-13700H" },
    });
    expect(matcher.match("  Intel Core i7-13700H ")).toMatchObject({ via: "exact" });
  });

  it("matches idealo-style strings as 'normalized'", () => {
    expect(matcher.match("Intel® Core™ i7-13700H, 14x 2.40GHz")).toMatchObject({
      status: "matched",
      via: "normalized",
      record: { name: "Intel Core i7-13700H" },
    });
    expect(nameOf(matcher.match("Intel Core i7-4770"))).toBe("Intel Core i7-4770 @ 3.40GHz");
    expect(nameOf(matcher.match("Apple M1 (8-Core CPU)"))).toBe("Apple M1 8 Core 3200 MHz");
    expect(nameOf(matcher.match("i7-13700H"))).toBe("Intel Core i7-13700H");
  });

  it("never mixes up suffix variants", () => {
    expect(nameOf(matcher.match("Intel Core i7-13700HX, 16 Kerne"))).toBe("Intel Core i7-13700HX");
    expect(nameOf(matcher.match("Intel Core i5-1335U"))).toBe("Intel Core i5-1335U");
    expect(nameOf(matcher.match("Intel Core i5-1335UE"))).toBe("Intel Core i5-1335UE");
    expect(nameOf(matcher.match("AMD Ryzen 5 7600X"))).toBe("AMD Ryzen 5 7600X");
    expect(nameOf(matcher.match("AMD Ryzen 5 7600X3D"))).toBe("AMD Ryzen 5 7600X3D");
    expect(nameOf(matcher.match("Intel Core i7-4770K"))).toBe("Intel Core i7-4770K @ 3.50GHz");
  });

  it("returns no_match instead of fuzzy-guessing", () => {
    expect(matcher.match("Intel Core i7-13700").status).toBe("no_match");
    expect(matcher.match("Intel Core i7-13700F").status).toBe("no_match");
    expect(matcher.match("AMD Ryzen 5 7600").status).toBe("no_match");
    expect(matcher.match("Intel Core i9-14900K").status).toBe("no_match");
    expect(matcher.match("Samsung Galaxy S24").status).toBe("no_match");
    expect(matcher.match("").status).toBe("no_match");
    expect(matcher.match("Apple M3 Pro 14-Core").status).toBe("no_match");
  });

  it("reports Apple chips without a core count as ambiguous, with every candidate", () => {
    const result = matcher.match("Apple M4");
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") {
      expect(result.candidates.map((c) => c.name)).toEqual(["Apple M4 10 Core", "Apple M4 8 Core"]);
    }
    expect(matcher.match("Apple M3 Pro").status).toBe("ambiguous");
    expect(nameOf(matcher.match("Apple M3 Pro (11-Core CPU)"))).toBe("Apple M3 Pro 11 Core");
    expect(nameOf(matcher.match("Apple M3 Pro 12-Core"))).toBe("Apple M3 Pro 12 Core");
  });

  it("prefers the plain Snapdragon X Elite name over the Oryon-suffixed one", () => {
    expect(nameOf(matcher.match("Qualcomm Snapdragon X Elite X1E-78-100"))).toBe(
      "Qualcomm Snapdragon X Elite - X1E-78-100",
    );
    expect(nameOf(matcher.match("Snapdragon X Elite - X1E78100 - Qualcomm Oryon"))).toBe(
      "Snapdragon X Elite - X1E78100 - Qualcomm Oryon",
    );
  });

  it("falls back to the normalized whole text for names without a structured model", () => {
    expect(nameOf(matcher.match("Intel Xeon E5-2680 v4"))).toBe("Intel Xeon E5-2680 v4 @ 2.40GHz");
    expect(nameOf(matcher.match("intel® xeon® e5 2680 v4"))).toBe(
      "Intel Xeon E5-2680 v4 @ 2.40GHz",
    );
  });

  it("accepts an already extracted CpuIdentity", () => {
    const identity = extractCpuIdentity("AMD Ryzen 7 7840HS (8x 3.80GHz)");
    expect(identity).not.toBeNull();
    if (identity) expect(nameOf(matcher.match(identity))).toBe("AMD Ryzen 7 7840HS");
  });
});

describe("duplicate handling", () => {
  it("prefers the single-socket record when a name repeats", () => {
    const snapshot = cpuSnapshotOf(
      cpuRow({ id: "50", name: "Testcorp EPYC 1000", cpuCount: "2" }),
      cpuRow({ id: "50", name: "Testcorp EPYC 1000", cpuCount: 1 }),
    );
    const result = createCanonicalKeyMatcher(snapshot).match("Testcorp EPYC 1000");
    expect(result).toMatchObject({ status: "matched", record: { socketCount: 1 } });
  });

  it("is ambiguous when two single-socket records share a name", () => {
    const snapshot = passmarkCpuSource.parse(
      asJson([
        cpuRow({ id: "1", name: "Testcorp Core X1-1000" }),
        cpuRow({ id: "2", name: "Testcorp Core X1-1000" }),
      ]),
    );
    const result = createCanonicalKeyMatcher(snapshot).match("Testcorp Core X1-1000");
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") expect(result.candidates.map((c) => c.id)).toEqual([1, 2]);
  });

  it("prefers the plain name over a 'with Radeon' variant of the same chip", () => {
    const matcher = createCanonicalKeyMatcher(
      namedCpus("AMD Ryzen 5 3580U with Radeon Vega Mobile Gfx", "AMD Ryzen 5 3580U"),
    );
    expect(nameOf(matcher.match("AMD Ryzen 5 3580U"))).toBe("AMD Ryzen 5 3580U");
    expect(nameOf(matcher.match("AMD Ryzen 5 3580U with Radeon Vega Mobile Gfx"))).toBe(
      "AMD Ryzen 5 3580U with Radeon Vega Mobile Gfx",
    );
  });

  it("matches the same chip when PassMark only has an edition-suffixed name", () => {
    const matcher = createCanonicalKeyMatcher(
      namedCpus("AMD Ryzen 7 4850U Mobile", "AMD Ryzen 9 6900HS Creator Edition"),
    );
    expect(nameOf(matcher.match("AMD Ryzen 7 4850U"))).toBe("AMD Ryzen 7 4850U Mobile");
    expect(nameOf(matcher.match("AMD Ryzen 9 6900HS"))).toBe("AMD Ryzen 9 6900HS Creator Edition");
    expect(nameOf(matcher.match("AMD Ryzen 9 6900H"))).toBe("no_match");
  });
});

describe("Intel N-series names", () => {
  const matcher = createCanonicalKeyMatcher(
    namedCpus(
      "Intel N150",
      "Intel N100",
      "Intel Celeron N5095 @ 2.00GHz",
      "Intel Celeron N5095A @ 2.00GHz",
      "Intel Pentium Silver N6000 @ 1.10GHz",
      "Intel Core 3 N355",
      "Intel Core i3-N305",
    ),
  );

  it("resolves marketing Celeron/Pentium N names to PassMark's plain Intel N record", () => {
    expect(nameOf(matcher.match("Intel Celeron N150"))).toBe("Intel N150");
    expect(nameOf(matcher.match("Intel Pentium N100"))).toBe("Intel N100");
    expect(nameOf(matcher.match('Lenovo V15 15,6" Intel Celeron N150, 32GB RAM'))).toBe(
      "Intel N150",
    );
  });

  it("keeps the brand for older N-series parts that PassMark names with it", () => {
    expect(nameOf(matcher.match("Intel Celeron N5095"))).toBe("Intel Celeron N5095 @ 2.00GHz");
    expect(nameOf(matcher.match("Intel Celeron N5095A"))).toBe("Intel Celeron N5095A @ 2.00GHz");
    expect(nameOf(matcher.match("Intel Pentium Silver N6000"))).toBe(
      "Intel Pentium Silver N6000 @ 1.10GHz",
    );
  });

  it("does not turn a missing N-series model into a neighbour", () => {
    expect(matcher.match("Intel Celeron N200").status).toBe("no_match");
    expect(matcher.match("Intel Celeron N15").status).toBe("no_match");
    expect(matcher.match("Intel Celeron").status).toBe("no_match");
  });

  it("matches 'Intel Core N355' to PassMark's 'Intel Core 3 N355' only", () => {
    expect(nameOf(matcher.match("Intel Core N355"))).toBe("Intel Core 3 N355");
    expect(nameOf(matcher.match("Intel Core 3 N355"))).toBe("Intel Core 3 N355");
    expect(matcher.match("Intel Core N350").status).toBe("no_match");
  });

  it("leaves the alias ambiguous when two tiers carry the same N model", () => {
    const twin = createCanonicalKeyMatcher(namedCpus("Intel Core 3 N355", "Intel Core 5 N355"));
    expect(twin.match("Intel Core N355").status).toBe("ambiguous");
  });
});

describe("matchText with brandless model tokens", () => {
  const matcher = createCanonicalKeyMatcher(
    namedCpus(
      "Intel Celeron N5095 @ 2.00GHz",
      "Intel Celeron N5095A @ 2.00GHz",
      "Intel Core i7-13700H",
      "Intel Core i7-13700HX",
      "AMD Ryzen 7 7840HS",
      "AMD Ryzen 7 7840HS with Radeon 780M Graphics",
      "AMD Ryzen 5 5600X",
      "AMD Ryzen 5 5600G",
      "Intel Core i5-1235U",
      "Testcorp Alpha 4821V",
      "Othercorp Beta 4821V",
      "AMD Ryzen 7 6800U",
      "Intel Xeon W-3175X",
    ),
  );

  it("finds a CPU named by its model token alone and labels the method", () => {
    expect(
      matcher.matchText(
        "15,6-Zoll-Laptop, 1920 X 1080 HD-Touchscreen, N5095-CPU, 32 GB RAM, 1TB SSD",
      ),
    ).toMatchObject({
      status: "matched",
      via: "model_token",
      record: { name: "Intel Celeron N5095 @ 2.00GHz" },
    });
    expect(matcher.matchText("Laptop 13700H 16GB")).toMatchObject({
      via: "model_token",
      record: { name: "Intel Core i7-13700H" },
    });
    expect(matcher.matchText("Notebook 1235U, 16 GB")).toMatchObject({
      record: { name: "Intel Core i5-1235U" },
    });
  });

  it("prefers the undecorated PassMark name when the token occurs in both", () => {
    expect(matcher.matchText("Mini PC 7840HS 32GB")).toMatchObject({
      via: "model_token",
      record: { name: "AMD Ryzen 7 7840HS" },
    });
  });

  it("does the same as match for text that names a CPU in full", () => {
    expect(matcher.matchText("Intel Core i7-13700H")).toMatchObject({ via: "exact" });
    expect(matcher.matchText("Intel Core i7-13700H, 14x 2.40GHz")).toMatchObject({
      via: "normalized",
    });
    expect(matcher.matchText("Intel Core i7-13700H")).toEqual(
      matcher.match("Intel Core i7-13700H"),
    );
  });

  it("does not use tokens when text names a CPU identity that PassMark lacks", () => {
    expect(matcher.matchText("Intel Core i7-13700F 5600X").status).toBe("no_match");
  });

  it("never reads numbers, capacities, resolutions or graphics chips as a CPU", () => {
    const texts = [
      "NVIDIA GeForce RTX 4060, 8GB",
      "RTX 4060Ti 16 GB",
      "Laptop 1920 X 1080, 512GB SSD, 32GB RAM",
      "1920x1080 120Hz 1000nits",
      "RTX 5070 Ti, 2560x1440",
      "16 GB DDR5-5600, 1TB",
    ];
    for (const text of texts) expect(matcher.matchText(text).status).toBe("no_match");
  });

  it("skips tokens that follow older graphics-chip words too", () => {
    const old = createCanonicalKeyMatcher(
      namedCpus(
        "Intel Core i3-350M @ 2.27GHz",
        "Intel Pentium P6300 @ 2.27GHz",
        "AMD Ryzen 5 5600XT",
      ),
    );
    for (const text of [
      "Laptop NVIDIA GeForce GTS 350M",
      "Quadro FX 350M",
      "Intel Iris Pro P6300",
      "GeForce FX 5600XT",
    ]) {
      expect(old.matchText(text).status).toBe("no_match");
    }
    expect(old.matchText("Notebook 350M 4GB")).toMatchObject({ status: "matched" });
  });

  it("skips a token that names a graphics chip, but not the same token elsewhere", () => {
    const clash = createCanonicalKeyMatcher(
      namedCpus("Testcorp Delta 6800M", "Testcorp Delta 7700S"),
    );
    expect(clash.matchText("Laptop Radeon RX 6800M, 16 GB").status).toBe("no_match");
    expect(clash.matchText("Laptop NVIDIA 6800M").status).toBe("no_match");
    expect(clash.matchText("Laptop Intel UHD Graphics, 7700S CPU")).toMatchObject({
      record: { name: "Testcorp Delta 7700S" },
    });
    expect(clash.matchText("Laptop Intel UHD Graphics 7700S")).toMatchObject({
      status: "no_match",
    });
    expect(clash.matchText("Laptop 6800M, 16 GB")).toMatchObject({
      record: { name: "Testcorp Delta 6800M" },
    });
    expect(clash.matchText("HD-Touchscreen Laptop 6800M")).toMatchObject({ status: "matched" });
  });

  it("returns no_match when the token belongs to several records", () => {
    expect(matcher.matchText("Notebook 4821V")).toEqual({ status: "no_match" });
  });

  it("returns no_match when different tokens name different CPUs", () => {
    expect(matcher.matchText("Notebook 5600X 5600G")).toEqual({ status: "no_match" });
    expect(matcher.matchText("Notebook 5600X 5600X")).toMatchObject({
      record: { name: "AMD Ryzen 5 5600X" },
    });
  });

  it("requires the whole token: a prefix of a longer model matches nothing", () => {
    expect(matcher.matchText("Laptop 13700 H").status).toBe("no_match");
    expect(matcher.matchText("Laptop 1370").status).toBe("no_match");
    expect(matcher.matchText("Laptop N509").status).toBe("no_match");
  });

  it("ignores pure-digit models and tokens with fewer than three digits", () => {
    const digits = createCanonicalKeyMatcher(
      namedCpus("AMD Athlon II X4 640", "Intel Core2 Duo T7"),
    );
    expect(digits.matchText("Desktop 640").status).toBe("no_match");
    expect(digits.matchText("Core2 Duo T7").status).toBe("no_match");
  });

  it("skips multi-socket records", () => {
    const snapshot = cpuSnapshotOf(cpuRow({ id: "50", name: "Testcorp EPYC 7R32", cpuCount: "2" }));
    expect(createCanonicalKeyMatcher(snapshot).matchText("Server 7R32").status).toBe("no_match");
  });
});
