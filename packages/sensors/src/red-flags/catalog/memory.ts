import { RED_FLAG_IDS as ID } from "../ids";
import { RED_FLAG_THRESHOLDS as T } from "../thresholds";
import { atMost, type FlagRule } from "./model";

export const MEMORY_RULES: readonly FlagRule[] = [
  {
    id: ID.ramTiny,
    device: "any",
    tier: "ram",
    fields: ["ramGb"],
    severity: "red",
    trips: ({ facts }) => atMost(facts.ramGb, T.ram.tinyMaxGb),
  },
  {
    id: ID.ramLow,
    device: "any",
    tier: "ram",
    fields: ["ramGb"],
    severity: "amber",
    trips: ({ facts }) => atMost(facts.ramGb, T.ram.lowMaxGb),
  },
  {
    id: ID.ramTypeOutdated,
    device: "any",
    fields: ["ramType"],
    severity: ({ ramType }) =>
      atMost(ramType?.generation, T.ram.typeRedMaxGeneration) ? "red" : "amber",
    trips: ({ facts }) => atMost(facts.ramType?.generation, T.ram.typeAmberMaxGeneration),
  },
  {
    id: ID.storageEmmc,
    device: "any",
    fields: ["storageKind", "storageGb"],
    severity: "red",
    trips: ({ facts }) => facts.storageKind === "emmc",
  },
  {
    id: ID.storageHddOnly,
    device: "any",
    fields: ["storageKind", "storageGb"],
    severity: "red",
    trips: ({ facts }) => facts.storageKind === "hdd",
  },
  {
    id: ID.storageTiny,
    device: "any",
    tier: "capacity",
    fields: ["storageGb"],
    severity: "red",
    trips: ({ facts }) => atMost(facts.storageGb, T.storage.tinyMaxGb),
  },
  {
    id: ID.storageSmall,
    device: "any",
    tier: "capacity",
    fields: ["storageGb"],
    severity: "amber",
    trips: ({ facts }) => atMost(facts.storageGb, T.storage.smallMaxGb),
  },
];
