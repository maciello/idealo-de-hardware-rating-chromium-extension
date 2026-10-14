import type { CpuIdentity } from "./model";

/** What a CPU model string is made of, for rules that key on the number, the suffix or the generation. */
export interface CpuModelParts {
  /** The model number without letters: 7840U -> 7840, N100 -> 100, "PRO 4650G" -> 4650. Null when the model has none. */
  readonly number: number | null;
  /** Letters in front of the number: "N" of N100, "G" of G4400. Empty for the usual "7840U". Null without a number. */
  readonly prefix: string | null;
  /** Everything behind the number: "U", "HX3D", "G7", "". Null without a number. */
  readonly suffix: string | null;
  /** Core i generation read from the number (13700H -> 13, 1355U -> 13, 8250U -> 8, 530 -> 1); null for every other family. */
  readonly generation: number | null;
  /** The model says PRO (AMD Ryzen PRO). */
  readonly pro: boolean;
  /** The model ends in PLUS (Core Ultra 7 270HX PLUS). */
  readonly plus: boolean;
  /** Tier words in front of the number, without PRO: "HX" of "HX 370", "MAX+" of "MAX+ 395". */
  readonly words: readonly string[];
}

const NUMBER_TOKEN = /^([A-Z]*)(\d+)([A-Z0-9+]*)$/;

/** Core i numbers: 5 digits are gen 10-14 (13700), 4 digits are gen 10-15 (1355) or gen 2-9 (8250), 3 digits are gen 1. */
function coreIGeneration(digits: number): number {
  const length = String(digits).length;
  if (length >= 5) return Math.floor(digits / 1000);
  if (length === 4) {
    const leading = Math.floor(digits / 100);
    return leading >= 10 && leading <= 15 ? leading : Math.floor(digits / 1000);
  }
  return 1;
}

/**
 * Splits `identity.model` into the parts the iGPU table keys on. A pure function of family and model, so
 * `CpuIdentity` itself stays small.
 */
export function cpuModelParts(identity: Pick<CpuIdentity, "family" | "model">): CpuModelParts {
  let tokens = identity.model.split(/\s+/).filter((token) => token !== "");
  const plus = tokens.at(-1) === "PLUS";
  if (plus) tokens = tokens.slice(0, -1);
  const pro = tokens.includes("PRO");
  const numberAt = tokens.findIndex((token) => NUMBER_TOKEN.test(token));
  const words = (numberAt === -1 ? [] : tokens.slice(0, numberAt)).filter((word) => word !== "PRO");
  const parts = numberAt === -1 ? null : NUMBER_TOKEN.exec(tokens[numberAt] ?? "");
  if (parts === null) {
    return { number: null, prefix: null, suffix: null, generation: null, pro, plus, words };
  }
  const [, prefix = "", digits = "", tail = ""] = parts;
  const number = Number(digits);
  return {
    number,
    prefix,
    suffix: tail + tokens.slice(numberAt + 1).join(""),
    generation:
      identity.family.startsWith("Core i") && prefix === "" ? coreIGeneration(number) : null,
    pro,
    plus,
    words,
  };
}
