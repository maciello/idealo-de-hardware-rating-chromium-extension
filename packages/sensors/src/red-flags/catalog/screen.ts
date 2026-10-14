import { RED_FLAG_IDS as ID } from "../ids";
import { RED_FLAG_THRESHOLDS as T } from "../thresholds";
import { atMost, below, type FlagRule } from "./model";

export const SCREEN_RULES: readonly FlagRule[] = [
  {
    id: ID.displayLowRes,
    device: "laptop",
    fields: ["displayHeightPx"],
    severity: "red",
    trips: ({ facts }) => below(facts.displayHeightPx, T.display.minHeightPx),
  },
  {
    id: ID.displayDim,
    device: "laptop",
    fields: ["brightnessNits"],
    severity: "amber",
    trips: ({ facts }) => atMost(facts.brightnessNits, T.display.dimMaxNits),
  },
];
