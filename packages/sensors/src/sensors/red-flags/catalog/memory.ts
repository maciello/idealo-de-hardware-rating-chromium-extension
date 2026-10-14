import { RED_FLAG_IDS as ID } from "../ids";
import { RED_FLAG_THRESHOLDS as T } from "../thresholds";
import { atMost, type FlagRule, flagRule } from "./model";

export const MEMORY_RULES: readonly FlagRule[] = [
  flagRule({
    id: ID.ramTiny,
    device: "any",
    tier: "ram",
    fields: ["ramGb"],
    severity: "red",
    trips: ({ facts }) => atMost(facts.ramGb, T.ram.tinyMaxGb),
    params: ({ facts }) => ({ ramGb: facts.ramGb }),
  }),
  flagRule({
    id: ID.ramLow,
    device: "any",
    tier: "ram",
    fields: ["ramGb"],
    severity: "amber",
    trips: ({ facts }) => atMost(facts.ramGb, T.ram.lowMaxGb),
    params: ({ facts }) => ({ ramGb: facts.ramGb }),
  }),
  flagRule({
    id: ID.ramTypeOutdated,
    device: "any",
    fields: ["ramType"],
    severity: ({ ramType }) =>
      atMost(ramType?.generation, T.ram.typeRedMaxGeneration) ? "red" : "amber",
    trips: ({ facts }) => atMost(facts.ramType?.generation, T.ram.typeAmberMaxGeneration),
    params: ({ facts }) => ({
      label: facts.ramType?.label,
      currentGeneration: T.ram.typeCurrentGeneration,
    }),
  }),
  flagRule({
    id: ID.storageEmmc,
    device: "any",
    fields: ["storageKind", "storageGb"],
    severity: "red",
    trips: ({ facts }) => facts.storageKind === "emmc",
    params: () => null,
  }),
  flagRule({
    id: ID.storageHddOnly,
    device: "any",
    fields: ["storageKind", "storageGb"],
    severity: "red",
    trips: ({ facts }) => facts.storageKind === "hdd",
    params: () => null,
  }),
  flagRule({
    id: ID.storageTiny,
    device: "any",
    tier: "capacity",
    fields: ["storageGb"],
    severity: "red",
    trips: ({ facts }) => atMost(facts.storageGb, T.storage.tinyMaxGb),
    params: ({ facts }) => ({ storageGb: facts.storageGb }),
  }),
  flagRule({
    id: ID.storageSmall,
    device: "any",
    tier: "capacity",
    fields: ["storageGb"],
    severity: "amber",
    trips: ({ facts }) => atMost(facts.storageGb, T.storage.smallMaxGb),
    params: ({ facts }) => ({ storageGb: facts.storageGb }),
  }),
];
