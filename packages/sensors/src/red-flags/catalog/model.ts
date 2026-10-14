import type { ProductFacts } from "../../facts";
import type { SensorClock, Signal } from "../../signal";
import type { FlagId } from "../ids";

/** The facts a rule can read and show as evidence. */
export type FlagField = Exclude<keyof ProductFacts, "cpuTdpWatts" | "webcam">;

type Severity = Signal["severity"];

export interface RuleContext {
  facts: ProductFacts;
  now: SensorClock;
}

/** One red flag. A rule that can trip at two severities computes it from the facts. */
export interface FlagRule {
  id: FlagId;
  /** "laptop" and "desktop" rules skip the other class and an unknown one; "any" runs for all. */
  device: "laptop" | "desktop" | "any";
  /** Rules of one tier exclude each other: list them worst first, only the first that trips is emitted. */
  tier?: string;
  /** Facts shown as evidence, when stated. */
  fields: readonly FlagField[];
  severity: Severity | ((facts: ProductFacts) => Severity);
  trips(context: RuleContext): boolean;
}

export const atMost = (value: number | undefined, limit: number): boolean =>
  value !== undefined && value <= limit;

export const below = (value: number | undefined, limit: number): boolean =>
  value !== undefined && value < limit;
