import {
  type CpuIdentity,
  type CpuModelParts,
  cleanText,
  cpuModelParts,
  slugify,
} from "../../identity";
import type { IgpuMatch, IgpuRule } from "./model";

/** Everything a rule key can read about one CPU. */
interface Probe {
  readonly identity: CpuIdentity | null;
  readonly parts: CpuModelParts | null;
  readonly labelKey: string;
}

type Tests = {
  [K in keyof IgpuMatch]-?: (wanted: NonNullable<IgpuMatch[K]>, probe: Probe) => boolean;
};

const has = <T>(list: readonly T[], value: T | null | undefined): boolean =>
  value !== null && value !== undefined && list.includes(value);

/** One test per key. A key that reads the identity fails for a CPU without one. */
const TESTS: Tests = {
  vendor: (wanted, { identity }) => identity?.vendor === wanted,
  family: (wanted, { identity }) => identity?.family === wanted,
  familyIn: (wanted, { identity }) => has(wanted, identity?.family),
  modelIn: (wanted, { identity }) => has(wanted, identity?.model),
  numberIn: (wanted, { parts }) => has(wanted, parts?.number),
  numberRange: ([low, high], { parts }) =>
    parts?.number != null && parts.number >= low && parts.number <= high,
  suffixIn: (wanted, { parts }) => has(wanted, parts?.suffix),
  prefix: (wanted, { parts }) => parts?.prefix === wanted,
  prefixIn: (wanted, { parts }) => has(wanted, parts?.prefix),
  genIn: (wanted, { parts }) => has(wanted, parts?.generation),
  pro: (wanted, { parts }) => parts?.pro === wanted,
  wordsIncludeAny: (wanted, { parts }) => wanted.some((word) => parts?.words.includes(word)),
  labelKeyIn: (wanted, { labelKey }) => wanted.includes(labelKey),
};

const matches = (match: IgpuMatch, probe: Probe): boolean =>
  (Object.keys(match) as (keyof IgpuMatch)[]).every((key) => {
    const wanted = match[key];
    // The cast joins the per-key test signatures; TESTS[key] always receives its own key's value.
    return wanted === undefined || (TESTS[key] as (w: unknown, p: Probe) => boolean)(wanted, probe);
  });

/**
 * The first rule that matches the CPU, or null. Order is behavior: rules for parts without graphics come first,
 * so an F-suffix part never reaches a rule that would give it an iGPU. `text` is the CPU as the page wrote it; its
 * slug feeds `labelKeyIn` rules.
 */
export function findIgpuRule(
  rules: readonly IgpuRule[],
  identity: CpuIdentity | null,
  text: string,
): IgpuRule | null {
  const probe: Probe = {
    identity,
    parts: identity === null ? null : cpuModelParts(identity),
    labelKey: slugify(cleanText(text)),
  };
  return rules.find((rule) => matches(rule.match, probe)) ?? null;
}
