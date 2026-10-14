import { extractGpuIdentity, type GpuIdentity } from "../gpu/identity";
import { type CpuIdentity, extractCpuIdentity } from "../identity/cpu-identity";
import { cleanText, stripNameDecoration } from "../identity/text";

/**
 * Comparison groups for percentile ratings, defined by what a buyer on idealo can choose: PC client devices.
 * Phone, embedded, server and virtual silicon is outside that domain by definition, not by score and not by PassMark's
 * `cat` (which files a Celeron N5095 under Desktop and a Core Ultra 9 285H under Mobile/Embedded).
 *
 * The classes are SETS THAT MAY OVERLAP: a family belongs to every device class it ships in. idealo's PC-Systeme list
 * Apple M, Intel N-series and mobile H/HS/HX/U chips in mini PCs, so those are DesktopCpu as well as LaptopCpu.
 * A record is in zero, one or two sets; `status` says why it is in none: "excluded" (out of domain by definition, a
 * named rule) or "unclassified" (no rule names it yet). Unclassified is counted and reported by the data-backed tests,
 * never silently dropped and never guessed.
 *
 * Universe U = {r in snapshot : socketCount(r) = 1 and r passes the cohort's year cutoff}. Membership depends only on
 * the parsed identity (vendor, family, model suffix) from `extractCpuIdentity` / `extractGpuIdentity`; names those
 * parsers do not read (Xeon, EPYC, Atom, ARM SoCs, vGPU profiles...) go through the closed, named rule tables below.
 *
 * CPUs
 *   Client       = {r in U : family(r) in {Intel Core i3/i5/i7/i9, Core Ultra, Core 3/5/7/9, Core N, Celeron, Pentium,
 *                  Intel N/U-series; AMD Ryzen, Ryzen AI, Athlon; Apple M; Snapdragon X/7c/8c/8cx; MediaTek Kompanio;
 *                  Apple A18 Pro}}
 *   LaptopCpu    = {r in Client : suffix(r) in MOBILE_SUFFIX(family) or family in {Apple M except Ultra, Apple A18 Pro,
 *                  Snapdragon, Kompanio, Ryzen AI, N-series, three-digit Ryzen}}
 *   DesktopCpu   = {r in Client : suffix(r) in DESKTOP_SUFFIX(family)} union {r in LaptopCpu : x86 mobile line or Apple M
 *                  or N-series} union HEDT/workstation {Threadripper, Xeon W, Apple M Ultra} union {Atom x, NVIDIA GB10}
 *                  (Snapdragon, Kompanio and Apple A18 Pro are laptop-only)
 *   ExcludedCpu  = {r in U : name in OutOfDomain}: virtual machines, bare core-IP and AArch64/Android names, dev boards,
 *                  phone SoCs (Snapdragon 8-series, Dimensity, Helio, Exynos, Tensor, Kirin, Apple A except A18 Pro),
 *                  server (Xeon except W, EPYC, Opteron, Ampere, Atom C), embedded (Ryzen Embedded, AMD GX/RX-, Intel
 *                  E/TE/HE/UE/PE/L-suffix IoT SKUs), CPUs not sold in DE retail (Hygon, Zhaoxin, Phytium, Kunpeng, CIX).
 *
 * GPUs (iGPU membership follows the host CPU family's class)
 *   LaptopGpu  = mobile discrete consumer {name says Laptop GPU/Max-Q, RX nnnnM/S, Arc AnnnM, GeForce MX, mobile-only
 *                GeForce} union mobile workstation {RTX Pro/A/Ada Laptop GPU, Quadro ...M, Radeon Pro nnnnM}
 *                union iGPUs of LaptopCpu families {Iris Xe, Arc 1x0V/1x0T, Radeon nnnM/nnnnS, unnumbered UHD, Adreno X,
 *                Adreno 6xx and Immortalis of Windows/Chromebook SoCs}
 *   DesktopGpu = desktop discrete consumer {GeForce, Radeon RX without M/S, Arc A/B} union workstation and AI cards
 *                {RTX A/Ada/PRO, Quadro, Radeon PRO W/AI Pro, GB10} union iGPUs of DesktopCpu families {UHD 710/730/750/770,
 *                Iris Xe, Arc, Radeon nnnM (mini PCs)}
 *   ExcludedGpu = virtual/remote adapters (GRID, vGPU profiles "-1B"/"-16Q", MS Idd, DisplayLink), datacenter accelerators
 *                (A100, L4, T4...), embedded and server editions, server iGPUs, phone GPUs (Adreno, Mali, PowerVR, Glenfly),
 *                mining cards (CMP).
 */
export type DeviceClass = "laptop" | "desktop";

export interface DeviceMembership {
  readonly laptop: boolean;
  readonly desktop: boolean;
  /** "member" = in at least one set; "excluded" = out of domain by a named rule; "unclassified" = no rule names it. */
  readonly status: "member" | "excluded" | "unclassified";
  /** The named rule that decided; "none" when unclassified. */
  readonly rule: string;
}

const LAPTOP = (rule: string): DeviceMembership => ({
  laptop: true,
  desktop: false,
  status: "member",
  rule,
});
const DESKTOP = (rule: string): DeviceMembership => ({
  laptop: false,
  desktop: true,
  status: "member",
  rule,
});
const BOTH = (rule: string): DeviceMembership => ({
  laptop: true,
  desktop: true,
  status: "member",
  rule,
});
const EXCLUDED = (rule: string): DeviceMembership => ({
  laptop: false,
  desktop: false,
  status: "excluded",
  rule,
});
const UNCLASSIFIED: DeviceMembership = {
  laptop: false,
  desktop: false,
  status: "unclassified",
  rule: "none",
};

interface NameRule {
  readonly rule: string;
  readonly result: "laptop" | "desktop" | "both" | "excluded";
  readonly test: RegExp;
}

const fromRule = ({ rule, result }: NameRule): DeviceMembership =>
  result === "laptop"
    ? LAPTOP(rule)
    : result === "desktop"
      ? DESKTOP(rule)
      : result === "both"
        ? BOTH(rule)
        : EXCLUDED(rule);

const byRules = (rules: readonly NameRule[], text: string): DeviceMembership | null => {
  const hit = rules.find(({ test }) => test.test(text));
  return hit === undefined ? null : fromRule(hit);
};

/** The model's own suffix letters: "1235U" -> "U", "1115G4" -> "G", "12900HX" -> "HX", "13400" -> "". */
const suffixOf = (model: string): string =>
  /^[A-Z]?\d{3,5}([A-Z]*)\d?$/.exec(model.replace(/ PLUS$/, ""))?.[1] ?? "?";

/** PassMark appends edition words and clock decorations that are not part of the chip. */
const plainName = (name: string): string =>
  stripNameDecoration(cleanText(name))
    .text.replace(/\b(radeon|core)\s?t?m?(?=\s)/g, "$1")
    .replace(/\s+(?:microsoft surface edition|creator edition|mobile)$/, "");

/** Intel i-series / Core Ultra / Core N / Core 3-9 suffixes. Closed lists, named by what they mean. */
const INTEL_MOBILE = new Set([
  "U",
  "H",
  "HX",
  "HK",
  "HQ",
  "P",
  "G",
  "Y",
  "M",
  "MQ",
  "QM",
  "UM",
  "XM",
  "V",
  "HS",
]);
const INTEL_DESKTOP = new Set([
  "",
  "F",
  "K",
  "KF",
  "KS",
  "KFC",
  "T",
  "S",
  "X",
  "XE",
  "B",
  "R",
  "C",
  "KC",
]);
/** IoT/embedded and "longevity" SKUs: E, TE, HE, UE, PE, GRE ("G7 + RE"), HL/UL, EQ. */
const INTEL_EMBEDDED = new Set([
  "E",
  "TE",
  "HE",
  "UE",
  "PE",
  "GRE",
  "HL",
  "UL",
  "EQ",
  "EF",
  "TEF",
  "RE",
  "HLE",
  "TLE",
  "EC",
  "QE",
  "L",
]);

/** Ryzen suffixes: mobile (U/H/HS/HX/C Chromebook) and desktop (none, X, XT, X3D, G, GE, GT, F). "E" is embedded. */
const RYZEN_MOBILE = new Set([
  "U",
  "H",
  "HS",
  "HX",
  "HX3D",
  "C",
  "CE",
  "UL",
  "HSL",
  "HL",
  "Z",
  "S",
]);
const RYZEN_DESKTOP = new Set([
  "",
  "X",
  "XT",
  "X3D",
  "G",
  "GE",
  "GT",
  "F",
  "T",
  "GX",
  "XE",
  "TX",
  "X3D2",
]);

interface SuffixTables {
  readonly mobile: ReadonlySet<string>;
  readonly desktop: ReadonlySet<string>;
  readonly embedded?: ReadonlySet<string>;
}

/** Mobile x86 lines are in both sets (mini PCs); desktop lines in DesktopCpu only; embedded SKUs are out of domain. */
const bySuffix = (family: string, suffix: string, tables: SuffixTables): DeviceMembership => {
  if (tables.embedded?.has(suffix)) return EXCLUDED(`${family}/embedded-suffix`);
  if (tables.mobile.has(suffix)) return BOTH(`${family}/mobile-suffix`);
  if (tables.desktop.has(suffix)) return DESKTOP(`${family}/desktop-suffix`);
  return UNCLASSIFIED;
};

const intelBySuffix = (family: string, model: string): DeviceMembership => {
  if (/^N\d{2,3}$/.test(model)) return BOTH(`${family}/n-series`);
  // Core Ultra Series 3 (3xx) is Panther Lake: mobile parts carry no suffix letter (355, 365) or an X prefix (X7 358H).
  if (family.startsWith("intel-core-ultra") && /^3\d{2}$/.test(model)) {
    return BOTH(`${family}/series-3-mobile`);
  }
  return bySuffix(family, suffixOf(model), {
    mobile: INTEL_MOBILE,
    desktop: INTEL_DESKTOP,
    embedded: INTEL_EMBEDDED,
  });
};

/** Celeron/Pentium: N-series both, G/J-series desktop (E/TE embedded), numbered with U/Y or bare 4-digit mobile lines both. */
function intelEntry(model: string): DeviceMembership {
  if (/^N\d{3,4}A?$/.test(model)) return BOTH("intel-entry/n-series");
  if (/^\d{4}$/.test(model)) return BOTH("intel-entry/numbered-mobile");
  const letter = /^([A-Z])\d{3,5}([A-Z]*)$/.exec(model);
  if (letter === null) return intelBySuffix("intel-entry", model);
  if (INTEL_EMBEDDED.has(letter[2] ?? "")) return EXCLUDED("intel-entry/embedded-suffix");
  return letter[1] === "G" || letter[1] === "J" ? DESKTOP("intel-entry/g-j-series") : UNCLASSIFIED;
}

function ryzenClass(family: string, model: string): DeviceMembership {
  if (family.startsWith("Ryzen AI")) return BOTH("ryzen-ai/mobile-family");
  const match = /^(\d{3,5})([A-Z0-9]*)$/.exec(model.split(" ").at(-1) ?? "");
  if (match === null) return UNCLASSIFIED;
  if (match[1]?.length === 3) return BOTH("ryzen/three-digit-mobile");
  const suffix = match[2] ?? "";
  if (suffix === "E") return EXCLUDED("ryzen/embedded-suffix");
  return bySuffix("ryzen", suffix, { mobile: RYZEN_MOBILE, desktop: RYZEN_DESKTOP });
}

function athlonClass(model: string): DeviceMembership {
  const suffix = /^\d{3,4}([A-Z]*)$/.exec(model)?.[1] ?? "?";
  if (["U", "C", "E", "UL"].includes(suffix)) return BOTH("athlon/mobile-suffix");
  if (["", "G", "GE", "X"].includes(suffix)) return DESKTOP("athlon/desktop-suffix");
  return UNCLASSIFIED;
}

/**
 * Closed rules for CPU names, checked in this order BEFORE the identity parser (a "(Virtual)" Apple M1 must not become an
 * Apple M1). Later entries are the chips the parser does not read at all.
 */
const CPU_NAME_RULES: readonly NameRule[] = [
  { rule: "virtual-machine", result: "excluded", test: /^virtual\b|\(virtual\)|\bvirtual cpu\b/ },
  { rule: "xeon-w-workstation", result: "desktop", test: /^intel xeon w\d?-|^intel xeon w\d{4}/ },
  { rule: "nvidia-gb10", result: "desktop", test: /^nvidia gb10\b|\bgb10\b/ },
  {
    rule: "snapdragon-x-and-compute",
    result: "laptop",
    test: /snapdragon x\d?\b|snapdragon x\d? (?:elite|plus)|^(?:qualcomm )?snapdragon (?:7c|8c|8cx)\b/,
  },
  { rule: "kompanio-chromebook", result: "laptop", test: /kompanio/ },
  {
    rule: "intel-iot-e-suffix",
    result: "excluded",
    test: /^intel (?:core i[3579]|celeron|pentium)[ -]+\w*?\d{4,5}[a-z]{0,3}\d?e\b/,
  },
  { rule: "apple-a18-pro-macbook", result: "laptop", test: /^apple a18 pro\b/ },
  { rule: "server-atom-c", result: "excluded", test: /^intel atom (?:c|p)\d/ },
  { rule: "atom-x-mini-pc", result: "desktop", test: /^intel atom x\d/ },
  { rule: "intel-processor-n-u", result: "both", test: /^intel (?:processor )?[nu]\d{2,3}\b/ },
  { rule: "handheld-ryzen-z", result: "laptop", test: /^amd ryzen (?:ai )?z\d/ },
  {
    rule: "bare-core-or-android",
    result: "excluded",
    test: /^arm\b|\barmv\d|aarch64|\bcortex\b|\bneoverse\b|\bkryo\b|\bfalkor\b|\bfirestorm\b|\bavalanche\b|android|aosp|emulator|\bboard\b|\bevb\d?\b/,
  },
  {
    rule: "dev-board-soc",
    result: "excluded",
    test: /^qti\b|^qct\b|dragonwing|\b(?:msm|apq|qcm|qcs)\d{3,4}|^sun\d+i|^sc\d{4}|^uis\d|^hi\d{4}|^rk\d{4}|^mtk\d|^nxp\b|^synaptics|^hardkernel|^google (?:gs|r\d)|^pxa\d|^qemu|^virt-|^stratovirt|common kvm|rockchip|allwinner|amlogic|spreadtrum|unisoc|broadcom|bcm\d{4}|nvidia tegra|cix p\d|\bimx\b|exynos auto/,
  },
  {
    rule: "phone-tablet-soc",
    result: "excluded",
    test: /snapdragon|qualcomm|dimensity|helio|mediatek|\bmt\d{4}|exynos|tensor|kirin|hisilicon|apple a\d|samsung|\bsm\d{4}|\bsdm\d{3}/,
  },
  {
    rule: "server",
    result: "excluded",
    test: /\bxeon\b|\bepyc\b|\bopteron\b|\bampere\b|\bmontage\b|\bthunderx\b|\bx-gene\b/,
  },
  {
    rule: "embedded",
    result: "excluded",
    test: /ryzen embedded|\bryzen v\d|\bamd gx-|\bamd rx-|\bamd r-series|\bembedded\b|\bgeode\b/,
  },
  {
    rule: "not-sold-in-de-retail",
    result: "excluded",
    test: /hygon|zhaoxin|phytium|centaurhauls|kunpeng|loongson/,
  },
];

/** Classifies a PassMark CPU name; `identity` may be passed when the caller already parsed it. */
export function classifyCpu(name: string, identity?: CpuIdentity | null): DeviceMembership {
  const text = plainName(name);
  const named = byRules(CPU_NAME_RULES, text);
  if (named !== null) return named;
  const parsed = identity === undefined ? extractCpuIdentity(text) : identity;
  if (parsed !== null) {
    const { vendor, family, model } = parsed;
    if (vendor === "Intel") {
      if (/^Core i\d$|^Core Ultra X?\d$|^Core \d$|^Core$/.test(family)) {
        return intelBySuffix(`intel-${family.toLowerCase().replace(/\s+/g, "-")}`, model);
      }
      if (family === "") return /^N\d/.test(model) ? BOTH("intel-n/n-series") : UNCLASSIFIED;
      if (family.startsWith("Celeron") || family.startsWith("Pentium")) return intelEntry(model);
    }
    if (vendor === "AMD") {
      if (family === "Ryzen Threadripper") return DESKTOP("threadripper/hedt");
      if (family.startsWith("Ryzen")) return ryzenClass(family, model);
      if (family.startsWith("Athlon")) return athlonClass(model);
    }
    if (vendor === "Apple")
      return /ULTRA$/.test(model.toUpperCase())
        ? DESKTOP("apple-m/ultra")
        : BOTH("apple-m/base-pro-max");
    if (vendor === "Qualcomm") return LAPTOP("snapdragon-x");
    if (vendor === "MediaTek") return LAPTOP("kompanio-chromebook");
  }
  return UNCLASSIFIED;
}

/** GPU names checked before the identity parser: nothing here is a buyable PC graphics part, or needs its host SoC. */
const GPU_EXCLUDE_RULES: readonly NameRule[] = [
  {
    rule: "vgpu-profile",
    result: "excluded",
    test: /^(?:nvidia )?[a-z]*\d+[a-z]?(?:-\d+)?-\d+[abcq]\b|\bgrid\b|\bvgpu\b/,
  },
  {
    rule: "virtual-display-adapter",
    result: "excluded",
    test: /\bidd|displaylink|mirror driver|mirage|basic (?:display|render)|miracast|logmein|parsec|citrix|vmware|virtualbox|hyper-v|usbdisplay|usb display|indirect display|display device|svga|virtio|qxl|remote|gdihook|cxdisplay|adapter$|\bpci\\ven_/,
  },
  {
    rule: "datacenter-accelerator",
    result: "excluded",
    test: /^(?:nvidia |ndivia )?(?:tesla )?(?:a(?:2|10g?|16|30|40|100|800)|l(?:4|20|40s?)|t4|h(?:20|100|200|800)|v100s?|p(?:4|40|100)|k(?:20|40|80)|m(?:4|40|60)|b200)\b|instinct|\bmi\d{2,3}\b/,
  },
  { rule: "mining-card", result: "excluded", test: /\bcmp \d+hx\b/ },
  {
    rule: "engineering-sample",
    result: "excluded",
    test: /eng sample|^custom gpu|^chell |^extension adapter/,
  },
  {
    rule: "virtualised-or-datacenter-radeon",
    result: "excluded",
    test: /mxgpu|radeon pro v\d{3}|radeon instinct/,
  },
  {
    rule: "pro-display-controller",
    result: "excluded",
    test: /^(?:barco|eizo|matrox)\b|\beizo\b/,
  },
  {
    rule: "windows-on-arm-and-chromebook-gpu",
    result: "laptop",
    test: /^(?:qualcomm )?adreno (?:x\d|618|68\d|690)|^arm immortalis g925/,
  },
  {
    rule: "phone-embedded-gpu",
    result: "excluded",
    test: /adreno|\bmali\b|powervr|immortalis|glenfly|arise|videocore|vivante|tegra|moore threads|zx c|fantasy|xdx|sangfor|tensor 1/,
  },
];

/** GPU names the identity parser does not read but that are PC workstation/AI parts. */
const GPU_PRO_RULES: readonly NameRule[] = [
  { rule: "nvidia-gb10", result: "desktop", test: /\bgb10\b/ },
  { rule: "radeon-ai-pro", result: "desktop", test: /radeon ai pro/ },
  {
    rule: "radeon-pro-mobile",
    result: "laptop",
    test: /^(?:amd )?radeon pro (?:w\d{4}m|\d{4}m)\b/,
  },
  { rule: "radeon-pro-wx", result: "both", test: /^(?:amd )?radeon pro wx\s?\d{4}/ },
  { rule: "radeon-pro-workstation", result: "desktop", test: /^(?:amd )?radeon pro w\d{4}x?\b/ },
  { rule: "radeon-vega-igpu", result: "both", test: /^(?:amd )?radeon (?:rx )?vega \d{1,2}$/ },
  { rule: "quadro-rtx-3000-mobile-only", result: "laptop", test: /quadro rtx 3000\b/ },
  { rule: "quadro-mobile", result: "laptop", test: /quadro [pkm]\d{3,4}m\b|\(mobile\)/ },
  { rule: "quadro-both-classes", result: "both", test: /\bquadro\b/ },
];

/** Mobile-only GeForce models: PassMark names them without "Laptop GPU" but no desktop card exists. */
const NVIDIA_MOBILE_ONLY = new Set(["2050", "3050 Ti", "1650 Ti"]);
/** Intel desktop iGPUs by model; unnumbered "UHD Graphics" is the mobile branding, other numbers exist in both. */
const INTEL_DESKTOP_IGPU = new Set(["710", "730", "750", "770"]);
/** Arc discrete cards by model: A-series mobile ends in M, desktop cards are this closed list; B370/B390 are Panther Lake iGPUs. */
const ARC_DESKTOP_DISCRETE = new Set([
  "A310",
  "A380",
  "A580",
  "A750",
  "A770",
  "B570",
  "B580",
  "A40",
  "A50",
  "A60",
  "B50",
  "B60",
  "B70",
]);
const ARC_IGPU_MODELS = new Set(["B370", "B390"]);
const EMBEDDED_QUALIFIER = /\b(?:embedded|server edition|server)\b/;

function gpuByIdentity(identity: GpuIdentity): DeviceMembership {
  const { family, model, variant, residual } = identity;
  if (EMBEDDED_QUALIFIER.test(cleanText(residual))) return EXCLUDED("embedded-or-server-edition");
  const first = model.split(" ")[0] ?? "";
  if (variant === "laptop") return LAPTOP("name-says-laptop-or-max-q");
  switch (family) {
    case "GeForce MX":
      return LAPTOP("geforce-mx");
    case "GeForce RTX":
    case "GeForce GTX":
    case "GeForce GT":
      return NVIDIA_MOBILE_ONLY.has(model)
        ? LAPTOP("nvidia-mobile-only")
        : DESKTOP("geforce-discrete");
    case "Radeon RX":
      return /\d[MS]$/.test(first) ? LAPTOP("radeon-rx-m-s-suffix") : DESKTOP("radeon-rx-desktop");
    case "Radeon":
      return /^\d{3,4}M$|^\d{4}S$|^\d{4}C?E$/.test(first)
        ? BOTH("radeon-igpu-mobile-line")
        : UNCLASSIFIED;
    case "Arc":
    case "Arc Pro":
      if (/^A\d{2,3}M$/.test(first)) return LAPTOP("arc-mobile-discrete");
      if (ARC_DESKTOP_DISCRETE.has(first)) return DESKTOP("arc-desktop-discrete");
      return /^1[34]0[VT]$|^$/.test(first) || ARC_IGPU_MODELS.has(first)
        ? BOTH("arc-igpu")
        : UNCLASSIFIED;
    case "Iris Xe":
      return model === "" ? BOTH("iris-xe") : LAPTOP("iris-xe-max");
    case "Iris":
    case "Iris Plus":
    case "Iris Pro":
      return /^\d/.test(first) ? BOTH("iris-mobile-line") : UNCLASSIFIED;
    case "UHD Graphics":
    case "HD Graphics":
      if (INTEL_DESKTOP_IGPU.has(first)) return DESKTOP("intel-desktop-igpu");
      // Every other Intel iGPU generation ships in notebooks and in desktops/mini PCs; P-series are Xeon parts.
      return first === "" || /^\d/.test(first) ? BOTH("intel-igpu-both-classes") : UNCLASSIFIED;
    case "T":
      return BOTH("nvidia-t-series-workstation");
    case "RTX Ada":
    case "RTX":
    case "RTX PRO":
      return DESKTOP("nvidia-workstation");
    default:
      return UNCLASSIFIED;
  }
}

/** Classifies a PassMark GPU name. Exclusion rules run first; an iGPU named after a CPU follows that CPU's membership. */
export function classifyGpu(name: string): DeviceMembership {
  const text = plainName(name);
  const excludedFirst = byRules(GPU_EXCLUDE_RULES, text);
  if (excludedFirst !== null) return excludedFirst;
  if (/^(?:amd )?(?:radeon|ryzen)\b|^intel (?:graphics|uhd|hd|iris|arc)\b/.test(text)) {
    const cpu = classifyCpu(text);
    if (cpu.status === "member") return { ...cpu, rule: `igpu-of-${cpu.rule}` };
    if (cpu.status === "excluded") return EXCLUDED(`igpu-of-${cpu.rule}`);
  }
  const proRule = byRules(GPU_PRO_RULES, text);
  if (proRule !== null) return proRule;
  const identity = extractGpuIdentity(text);
  return identity === null ? UNCLASSIFIED : gpuByIdentity(identity);
}
