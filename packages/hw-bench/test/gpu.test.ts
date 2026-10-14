import { describe, expect, it } from "vitest";
import { createGpuMatcher, extractGpuIdentity, passmarkGpuSource } from "../src";
import { asJson, gpuRow } from "./fixtures";

describe("extractGpuIdentity", () => {
  it.each([
    ["NVIDIA GeForce RTX 5080", "geforce-rtx-5080", null, false],
    ["NVIDIA GeForce RTX 4060 (8GB)", "geforce-rtx-4060", 8, false],
    ["GeForce RTX 4060 Ti 16384 MB", "geforce-rtx-4060-ti", 16, false],
    ["NVIDIA GeForce RTX 4070 Ti SUPER 16 GB", "geforce-rtx-4070-ti-super", 16, false],
    ["RTX 3050 A Laptop GPU", "geforce-rtx-3050-a", null, true],
    ["GeForce GTX 1650 Ti with Max-Q Design", "geforce-gtx-1650-ti", null, true],
    ["GTX1660", "geforce-gtx-1660", null, false],
    ["AMD Radeon RX 7600M XT", "radeon-rx-7600m-xt", null, false],
    ["Radeon RX 7900 XTX", "radeon-rx-7900-xtx", null, false],
    ["AMD Radeon 8060S", "radeon-8060s", null, false],
    ["AMD Radeon 780M Graphics", "radeon-780m", null, false],
    ["Intel Arc A770M", "arc-a770m", null, false],
    ["Intel Arc 140V GPU", "arc-140v", null, false],
    ["Intel Iris Xe Graphics", "iris-xe", null, false],
    ["Intel UHD Graphics 770", "uhd-graphics-770", null, false],
  ])("%s -> %s", (text, key, memoryGb, laptop) => {
    const identity = extractGpuIdentity(text);
    expect(identity?.key).toBe(key);
    expect(identity?.memoryGb).toBe(memoryGb);
    expect(identity?.variant === "laptop").toBe(laptop);
  });

  it("reports leftover text so decorated names are not mistaken for plain ones", () => {
    expect(extractGpuIdentity("GeForce RTX 3050 OEM")?.residual).toBe("oem");
    expect(extractGpuIdentity("Radeon 610M Ryzen 5 7645HX")?.residual).not.toBe("");
    expect(extractGpuIdentity("NVIDIA GeForce RTX 4060 (8GB)")?.residual).toBe("");
  });

  it("returns null instead of guessing", () => {
    expect(extractGpuIdentity("Quadro P2000")).toBeNull();
    expect(extractGpuIdentity("Intel Core i7-13700H")).toBeNull();
    expect(extractGpuIdentity("")).toBeNull();
  });
});

const snapshotOf = (...rows: readonly { name: string; cat: string; g3d: string }[]) =>
  passmarkGpuSource.parse(
    asJson(
      rows.map((r, i) => gpuRow({ id: String(7100 + i), name: r.name, cat: r.cat, g3d: r.g3d })),
    ),
  );

describe("createGpuMatcher", () => {
  const matcher = createGpuMatcher(
    snapshotOf(
      { name: "GeForce RTX 9080", cat: "Desktop", g3d: "36,001" },
      { name: "GeForce RTX 9080 Laptop GPU", cat: "Mobile", g3d: "26,002" },
      { name: "GeForce RTX 9060", cat: "Desktop", g3d: "19,003" },
      { name: "GeForce RTX 9060 Laptop GPU", cat: "Mobile", g3d: "17,004" },
      { name: "GeForce RTX 9060 Ti", cat: "Desktop", g3d: "22,005" },
      { name: "GeForce RTX 9050 6GB", cat: "Desktop", g3d: "9,006" },
      { name: "GeForce RTX 9050 6GB Laptop GPU", cat: "Mobile", g3d: "8,007" },
      { name: "GeForce RTX 9050 Laptop GPU", cat: "Mobile", g3d: "7,008" },
      { name: "GeForce RTX 9050 OEM", cat: "Desktop", g3d: "6,009" },
      { name: "GeForce RTX 8060 (Mobile)", cat: "Mobile", g3d: "5,010" },
      { name: "GeForce RTX 8060 with Max-Q Design", cat: "Mobile", g3d: "4,011" },
      { name: "GeForce RTX 8060", cat: "Desktop", g3d: "6,012" },
      { name: "Radeon 9060S", cat: "Desktop", g3d: "18,013" },
      { name: "Radeon 9040M", cat: "Mobile", g3d: "3,014" },
      { name: "Radeon RX 9600M XT", cat: "Mobile", g3d: "14,015" },
      { name: "Radeon RX 9600 XT", cat: "Desktop", g3d: "17,016" },
      { name: "Intel UHD 900", cat: "Unknown", g3d: "1,017" },
      { name: "Intel UHD Graphics 900", cat: "Unknown", g3d: "1,018" },
      { name: "Quadro Z1000", cat: "Workstation", g3d: "2,019" },
    ),
  );
  const nameOf = (query: string, formFactor?: "laptop" | "desktop" | "unknown") => {
    const result = matcher.match(query, formFactor === undefined ? undefined : { formFactor });
    return result.status === "matched"
      ? result.record.name
      : result.status === "ambiguous"
        ? result.candidates.map((c) => c.name)
        : result.status;
  };

  it("prefers the Laptop GPU record for laptops and the plain record for desktops", () => {
    expect(nameOf("NVIDIA GeForce RTX 9080", "laptop")).toBe("GeForce RTX 9080 Laptop GPU");
    expect(nameOf("NVIDIA GeForce RTX 9080", "desktop")).toBe("GeForce RTX 9080");
  });

  it("is ambiguous with both candidates when the form factor is unknown", () => {
    expect(nameOf("NVIDIA GeForce RTX 9080", "unknown")).toEqual([
      "GeForce RTX 9080",
      "GeForce RTX 9080 Laptop GPU",
    ]);
    expect(nameOf("NVIDIA GeForce RTX 9080")).toEqual([
      "GeForce RTX 9080",
      "GeForce RTX 9080 Laptop GPU",
    ]);
    expect(nameOf("GeForce RTX 9080")).toEqual(["GeForce RTX 9080", "GeForce RTX 9080 Laptop GPU"]);
  });

  it("strips memory sizes and the vendor before matching", () => {
    expect(nameOf("NVIDIA GeForce RTX 9060 (8GB)", "laptop")).toBe("GeForce RTX 9060 Laptop GPU");
    expect(nameOf("NVIDIA GeForce RTX 9060 8 GB", "desktop")).toBe("GeForce RTX 9060");
  });

  it("uses the memory size to pick between sized variants, and falls back without it", () => {
    expect(nameOf("GeForce RTX 9050 (6GB)", "laptop")).toBe("GeForce RTX 9050 6GB Laptop GPU");
    expect(nameOf("GeForce RTX 9050 6GB", "desktop")).toBe("GeForce RTX 9050 6GB");
    expect(nameOf("GeForce RTX 9050 (4GB)", "laptop")).toBe("GeForce RTX 9050 Laptop GPU");
    expect(nameOf("GeForce RTX 9050", "laptop")).toBe("GeForce RTX 9050 Laptop GPU");
  });

  it("keeps variants apart: Ti, XT and M/S suffixes are different GPUs", () => {
    expect(nameOf("GeForce RTX 9060 Ti", "laptop")).toBe("GeForce RTX 9060 Ti");
    expect(nameOf("Radeon RX 9600M XT", "laptop")).toBe("Radeon RX 9600M XT");
    expect(nameOf("Radeon RX 9600 XT", "desktop")).toBe("Radeon RX 9600 XT");
  });

  it("keeps desktop-only GPUs for laptops and laptop-only GPUs for desktops", () => {
    expect(nameOf("AMD Radeon 9060S", "laptop")).toBe("Radeon 9060S");
    expect(nameOf("AMD Radeon 9060S", "unknown")).toBe("Radeon 9060S");
    expect(nameOf("AMD Radeon 9040M", "desktop")).toBe("Radeon 9040M");
  });

  it("lets the text override the form factor when it says Laptop GPU", () => {
    expect(nameOf("GeForce RTX 9080 Laptop GPU", "desktop")).toBe("GeForce RTX 9080 Laptop GPU");
    expect(nameOf("GeForce RTX 9080 (Mobile)")).toBe("GeForce RTX 9080 Laptop GPU");
  });

  it("separates Max-Q from plain mobile records", () => {
    expect(nameOf("GeForce RTX 8060", "laptop")).toBe("GeForce RTX 8060 (Mobile)");
    expect(nameOf("GeForce RTX 8060 Max-Q", "laptop")).toBe("GeForce RTX 8060 with Max-Q Design");
    expect(nameOf("GeForce RTX 8060", "desktop")).toBe("GeForce RTX 8060");
  });

  it("does not fold decorated names (OEM) into the plain model", () => {
    expect(nameOf("GeForce RTX 9050 OEM", "desktop")).toBe("GeForce RTX 9050 OEM");
  });

  it("settles PassMark duplicates by exact name only", () => {
    expect(nameOf("Intel UHD Graphics 900")).toBe("Intel UHD Graphics 900");
    expect(nameOf("Intel UHD 900")).toBe("Intel UHD 900");
    expect(nameOf("UHD 900")).toEqual(["Intel UHD 900", "Intel UHD Graphics 900"]);
  });

  it("falls back to the normalized whole name and otherwise says no_match", () => {
    expect(nameOf("NVIDIA Quadro Z1000")).toBe("Quadro Z1000");
    expect(nameOf("GeForce RTX 7777", "laptop")).toBe("no_match");
    expect(nameOf("Intel Core i7-13700H")).toBe("no_match");
  });

  it("accepts an extracted identity", () => {
    const identity = extractGpuIdentity("GeForce RTX 9080");
    expect(identity).not.toBeNull();
    if (identity === null) return;
    expect(matcher.match(identity, { formFactor: "laptop" })).toMatchObject({
      status: "matched",
      record: { name: "GeForce RTX 9080 Laptop GPU" },
    });
  });
});
