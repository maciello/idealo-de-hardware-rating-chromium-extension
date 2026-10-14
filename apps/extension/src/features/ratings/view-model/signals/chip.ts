import { RED_FLAG_IDS, type Signal } from "@idealo-hw/sensors";
import { RATINGS_COPY } from "../../copy";
import { warningsOf } from "../../model";

interface FlagsIndicator {
  count: number;
  /** The worst severity among the counted flags. */
  severity: "red" | "amber";
  /** Accessible name and title: the count and every label. */
  label: string;
}

interface MemoryTag {
  /** The memory type as the product writes it ("DDR4"). */
  text: string;
  title: string;
}

export interface SignalsChipModel {
  memory: MemoryTag | null;
  flags: FlagsIndicator | null;
  /** Spoken sentences for the tag and the indicator; `chipAria` joins them with the other lines. */
  aria: string[];
}

const memoryTagOf = (signals: readonly Signal[]): MemoryTag | null => {
  const outdated = signals.find((s) => s.id === RED_FLAG_IDS.ramTypeOutdated);
  const text = outdated?.evidence.find((e) => e.field === "ramType")?.value;
  return text === undefined ? null : { text, title: RATINGS_COPY.oldMemoryHint };
};

/** The memory tag stands for its flag on the chip, so the indicator counts the other warnings only. */
const flagsIndicatorOf = (signals: readonly Signal[]): FlagsIndicator | null => {
  const counted = warningsOf(signals).filter((s) => s.id !== RED_FLAG_IDS.ramTypeOutdated);
  if (counted.length === 0) return null;
  const severity = counted.some((s) => s.severity === "red") ? "red" : "amber";
  const label = RATINGS_COPY.flagsAria(
    counted.length,
    severity,
    counted.map((s) => s.label),
  );
  return { count: counted.length, severity, label };
};

/**
 * What the chip says about the product's signals: the older-memory tag and a count of the other red
 * and amber flags. Info signals and badges are card-only. Null when there is nothing to draw.
 */
export function signalsChipModel(signals: readonly Signal[]): SignalsChipModel | null {
  const memory = memoryTagOf(signals);
  const flags = flagsIndicatorOf(signals);
  if (memory === null && flags === null) return null;
  return {
    memory,
    flags,
    aria: [
      ...(memory ? [RATINGS_COPY.oldMemoryAria(memory.text, memory.title.toLowerCase())] : []),
      ...(flags ? [flags.label] : []),
    ],
  };
}
