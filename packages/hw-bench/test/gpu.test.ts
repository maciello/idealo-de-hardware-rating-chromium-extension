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
    ["Intel HD Graphics 630", "hd-graphics-630", null, false],
    ["Intel HD 630", "hd-graphics-630", null, false],
    ["Intel HD Graphics P4600", "hd-graphics-p4600", null, false],
    ["Intel Iris Plus Graphics 655", "iris-plus-655", null, false],
    ["Intel Iris Pro Graphics 6200", "iris-pro-6200", null, false],
    ["Intel Iris Graphics 540", "iris-540", null, false],
    ["Intel Xe Graphics", "iris-xe", null, false],
    ["Intel Iris Xe Graphics", "iris-xe", null, false],
    ["Intel Iris Xe MAX Graphics", "iris-xe-max", null, false],
    ["NVIDIA RTX 2000 Ada", "rtx-ada-2000", null, false],
    ["RTX 2000 Ada Generation Laptop GPU", "rtx-ada-2000", null, true],
    ["NVIDIA RTX 2000E Ada Generation", "rtx-ada-2000e", null, false],
    ["NVIDIA RTX A500", "rtx-a500", null, false],
    ["NVIDIA Quadro RTX A4000", "rtx-a4000", null, false],
    ["RTX A2000 8GB Laptop GPU", "rtx-a2000", 8, true],
    ["NVIDIA RTX PRO 2000 [Blackwell]", "rtx-pro-2000-blackwell", null, false],
    ["NVIDIA RTX Pro 2000", "rtx-pro-2000-blackwell", null, false],
    ["RTX PRO 2000 Blackwell Generation Laptop GPU", "rtx-pro-2000-blackwell", null, true],
    ["NVIDIA T1200", "t-t1200", null, false],
    ["NVIDIA Quadro T400", "t-t400", null, false],
    ["T550 Laptop GPU", "t-t550", null, true],
    ["Quadro T1000 with Max-Q Design", "t-t1000", null, true],
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

  it("does not read other vendors' or other products' look-alikes as the new families", () => {
    expect(extractGpuIdentity("AMD Radeon HD 5500")).toBeNull();
    expect(extractGpuIdentity("ATI HD 4850")).toBeNull();
    expect(extractGpuIdentity("Lenovo ThinkPad T480")).toBeNull();
    expect(extractGpuIdentity("T14 Gen 3")).toBeNull();
    expect(extractGpuIdentity("Intel Iris Graphics")).toBeNull();
    expect(extractGpuIdentity("Intel HD Graphics")).toBeNull();
    expect(extractGpuIdentity("Intel Xe-LPG")).toBeNull();
    expect(extractGpuIdentity("RTX PRO")).toBeNull();
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

describe("createGpuMatcher on workstation and Intel naming", () => {
  const matcher = createGpuMatcher(
    snapshotOf(
      { name: "Intel HD 630", cat: "Unknown", g3d: "1,111" },
      { name: "Intel HD Graphics 620", cat: "Unknown", g3d: "917" },
      { name: "Intel HD 5500", cat: "Unknown", g3d: "596" },
      { name: "Intel Iris Plus 655", cat: "Unknown", g3d: "1,723" },
      { name: "Intel Iris Xe", cat: "Unknown", g3d: "2,587" },
      { name: "Intel Iris Xe MAX", cat: "Unknown", g3d: "1,760" },
      { name: "RTX 2000 Ada Generation", cat: "Unknown", g3d: "16,926" },
      { name: "RTX 2000 Ada Generation Laptop GPU", cat: "Mobile", g3d: "14,816" },
      { name: "RTX 2000 Ada Generation Embedded GPU", cat: "Desktop", g3d: "13,243" },
      { name: "RTX 2000E Ada Generation", cat: "Desktop", g3d: "15,466" },
      { name: "RTX 500 Ada Generation Laptop GPU", cat: "Mobile", g3d: "11,196" },
      { name: "RTX A500 Embedded GPU", cat: "Desktop", g3d: "6,099" },
      { name: "RTX A500 Laptop GPU", cat: "Mobile", g3d: "6,567" },
      { name: "RTX A4000", cat: "Workstation", g3d: "19,311" },
      { name: "RTX A4000 Laptop GPU", cat: "Mobile, Workstation", g3d: "14,505" },
      { name: "RTX A4000H", cat: "Desktop", g3d: "16,768" },
      { name: "Quadro RTX 4000", cat: "Workstation", g3d: "14,841" },
      { name: "RTX PRO 2000 Blackwell", cat: "Desktop", g3d: "20,273" },
      { name: "RTX PRO 2000 Blackwell Generation Laptop GPU", cat: "Mobile", g3d: "16,505" },
      { name: "RTX PRO 2000 Blackwell Embedded GPU", cat: "Desktop", g3d: "16,242" },
      { name: "RTX PRO 6000 Blackwell Server Edition", cat: "Desktop", g3d: "31,099" },
      { name: "RTX PRO 6000 Blackwell Workstation Edition", cat: "Desktop", g3d: "37,605" },
      { name: "NVIDIA T1200 Laptop GPU", cat: "Mobile, Workstation", g3d: "7,816" },
      { name: "T550 Laptop GPU", cat: "Mobile", g3d: "4,727" },
      { name: "T400", cat: "Unknown", g3d: "3,615" },
      { name: "T400 4GB", cat: "Unknown", g3d: "3,810" },
      { name: "ABIT Siluro T400", cat: "Unknown", g3d: "4" },
      { name: "NVIDIA T1000", cat: "Workstation", g3d: "7,660" },
      { name: "Quadro T1000", cat: "Mobile", g3d: "6,530" },
      { name: "Radeon HD 5500", cat: "Unknown", g3d: "300" },
      { name: "GeForce RTX 9070 Ti 8GB", cat: "Desktop", g3d: "30,001" },
      { name: "GeForce RTX 9070 Ti 16GB", cat: "Desktop", g3d: "31,002" },
      { name: "GeForce RTX 9070 Ti 16GB Laptop GPU", cat: "Mobile", g3d: "25,003" },
    ),
  );
  const nameOf = (text: string, formFactor: "laptop" | "desktop" | "unknown" = "unknown") => {
    const result = matcher.match(text, { formFactor });
    if (result.status === "matched") return result.record.name;
    if (result.status === "ambiguous") return result.candidates.map((c) => c.name);
    return null;
  };

  it("reads Intel HD, Iris Plus and Xe marketing names as PassMark's shorter names", () => {
    expect(nameOf("Intel HD Graphics 630")).toBe("Intel HD 630");
    expect(nameOf("Intel HD 630")).toBe("Intel HD 630");
    expect(nameOf("Intel HD Graphics 620")).toBe("Intel HD Graphics 620");
    expect(nameOf("Intel HD Graphics 5500")).toBe("Intel HD 5500");
    expect(nameOf("Intel Iris Plus Graphics 655")).toBe("Intel Iris Plus 655");
    expect(nameOf("Intel Xe Graphics")).toBe("Intel Iris Xe");
    expect(nameOf("Intel Iris Xe Graphics")).toBe("Intel Iris Xe");
    expect(nameOf("Intel Iris Xe MAX Graphics")).toBe("Intel Iris Xe MAX");
  });

  it("leaves generic or absent Intel labels unmatched", () => {
    expect(nameOf("Intel HD Graphics")).toBeNull();
    expect(nameOf("Intel HD Graphics 600")).toBeNull();
    expect(nameOf("Intel Iris Graphics")).toBeNull();
    expect(nameOf("Intel Iris Plus Graphics")).toBeNull();
    expect(nameOf("Intel Iris Plus Graphics 640")).toBeNull();
    expect(nameOf("Intel Arc Graphics")).toBeNull();
  });

  it("never turns an AMD Radeon HD into an Intel HD of the same number", () => {
    expect(nameOf("AMD Radeon HD 5500")).toBe("Radeon HD 5500");
    expect(nameOf("AMD Radeon HD 630")).toBeNull();
  });

  it("picks RTX Ada by form factor and keeps E and Embedded parts apart", () => {
    expect(nameOf("NVIDIA RTX 2000 Ada", "laptop")).toBe("RTX 2000 Ada Generation Laptop GPU");
    expect(nameOf("NVIDIA RTX 2000 Ada", "desktop")).toBe("RTX 2000 Ada Generation");
    expect(nameOf("NVIDIA RTX 2000 Ada", "unknown")).toEqual([
      "RTX 2000 Ada Generation",
      "RTX 2000 Ada Generation Laptop GPU",
    ]);
    expect(nameOf("NVIDIA RTX 2000E Ada Generation")).toBe("RTX 2000E Ada Generation");
    expect(nameOf("NVIDIA RTX 500 Ada", "laptop")).toBe("RTX 500 Ada Generation Laptop GPU");
    expect(nameOf("NVIDIA RTX 3000 Ada", "laptop")).toBeNull();
    expect(nameOf("NVIDIA RTX 2000", "laptop")).toBeNull();
  });

  it("matches RTX A-series, also when idealo writes Quadro RTX A4000", () => {
    expect(nameOf("NVIDIA RTX A500", "laptop")).toBe("RTX A500 Laptop GPU");
    expect(nameOf("NVIDIA Quadro RTX A4000", "desktop")).toBe("RTX A4000");
    expect(nameOf("NVIDIA Quadro RTX A4000", "laptop")).toBe("RTX A4000 Laptop GPU");
    expect(nameOf("NVIDIA RTX A4000H")).toBe("RTX A4000H");
  });

  it("keeps Turing Quadro RTX apart from the A-series", () => {
    expect(nameOf("NVIDIA Quadro RTX 4000")).toBe("Quadro RTX 4000");
    expect(nameOf("NVIDIA Quadro RTX 4000", "laptop")).toBe("Quadro RTX 4000");
  });

  it("treats the architecture word of RTX PRO as optional and picks by form factor", () => {
    expect(nameOf("NVIDIA RTX PRO 2000 [Blackwell]", "laptop")).toBe(
      "RTX PRO 2000 Blackwell Generation Laptop GPU",
    );
    expect(nameOf("NVIDIA RTX Pro 2000", "desktop")).toBe("RTX PRO 2000 Blackwell");
    expect(nameOf("NVIDIA RTX PRO 2000 Blackwell", "desktop")).toBe("RTX PRO 2000 Blackwell");
  });

  it("leaves RTX PRO models with only edition-qualified records unmatched", () => {
    expect(nameOf("NVIDIA RTX PRO 6000")).toBeNull();
    expect(nameOf("NVIDIA RTX PRO 6000 Blackwell")).toBeNull();
  });

  it("matches Turing T-series with and without the Quadro or NVIDIA prefix", () => {
    expect(nameOf("NVIDIA T1200", "laptop")).toBe("NVIDIA T1200 Laptop GPU");
    expect(nameOf("NVIDIA T550")).toBe("T550 Laptop GPU");
    expect(nameOf("NVIDIA Quadro T400")).toBe("T400");
    expect(nameOf("NVIDIA T1000", "laptop")).toBe("Quadro T1000");
    expect(nameOf("NVIDIA T1000", "desktop")).toBe("NVIDIA T1000");
    expect(nameOf("NVIDIA T1100")).toBeNull();
  });

  it("returns ambiguous for a model that only exists per memory size", () => {
    expect(nameOf("NVIDIA GeForce RTX 9070 Ti", "desktop")).toEqual([
      "GeForce RTX 9070 Ti 16GB",
      "GeForce RTX 9070 Ti 8GB",
    ]);
    expect(nameOf("NVIDIA GeForce RTX 9070 Ti", "laptop")).toBe(
      "GeForce RTX 9070 Ti 16GB Laptop GPU",
    );
    expect(nameOf("NVIDIA GeForce RTX 9070 Ti 8GB", "desktop")).toBe("GeForce RTX 9070 Ti 8GB");
    expect(nameOf("NVIDIA GeForce RTX 9070 Ti 24GB", "desktop")).toBeNull();
  });
});

describe("createGpuMatcher with Max-Q-only mobile records", () => {
  const matcher = createGpuMatcher(
    snapshotOf(
      { name: "GeForce RTX 8070 Super", cat: "Desktop", g3d: "21,001" },
      { name: "GeForce RTX 8070 Super with Max-Q Design", cat: "Mobile", g3d: "15,002" },
    ),
  );

  it("reports the Max-Q record as ambiguous for text that does not say Max-Q", () => {
    const result = matcher.match("NVIDIA GeForce RTX 8070 Super", { formFactor: "laptop" });
    expect(result).toMatchObject({
      status: "ambiguous",
      candidates: [{ name: "GeForce RTX 8070 Super with Max-Q Design" }],
    });
  });

  it("matches it when the text says Max-Q, and keeps desktops on the desktop card", () => {
    expect(matcher.match("GeForce RTX 8070 Super Max-Q", { formFactor: "laptop" })).toMatchObject({
      status: "matched",
      record: { name: "GeForce RTX 8070 Super with Max-Q Design" },
    });
    expect(matcher.match("NVIDIA GeForce RTX 8070 Super", { formFactor: "desktop" })).toMatchObject(
      { status: "matched", record: { name: "GeForce RTX 8070 Super" } },
    );
  });
});
