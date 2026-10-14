import type { Sensor, SensorInput, Signal } from "../../signal";
import { FLAG_RULES, type FlagRule } from "./catalog";
import { evidenceOf } from "./evidence";
import { RED_FLAGS_SENSOR_ID } from "./ids";

const appliesTo = (rule: FlagRule, deviceClass: SensorInput["deviceClass"]): boolean =>
  rule.device === "any" || rule.device === deviceClass;

const signalOf = (rule: FlagRule, input: SensorInput): Signal => ({
  sensorId: RED_FLAGS_SENSOR_ID,
  id: rule.id,
  kind: "flag",
  severity: typeof rule.severity === "function" ? rule.severity(input.facts) : rule.severity,
  params: rule.params(input),
  evidence: evidenceOf(rule.fields, input.facts),
});

/** Flags what is wrong with a product; of rules sharing a tier only the worst one that trips reports. */
export const redFlagsSensor: Sensor = {
  id: RED_FLAGS_SENSOR_ID,
  sense(input): Signal[] {
    const signals: Signal[] = [];
    const filledTiers = new Set<string>();
    for (const rule of FLAG_RULES) {
      if (!appliesTo(rule, input.deviceClass)) continue;
      if (rule.tier !== undefined && filledTiers.has(rule.tier)) continue;
      if (!rule.trips(input)) continue;
      if (rule.tier !== undefined) filledTiers.add(rule.tier);
      signals.push(signalOf(rule, input));
    }
    return signals;
  },
};
