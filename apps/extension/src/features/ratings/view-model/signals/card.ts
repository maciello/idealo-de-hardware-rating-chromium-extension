import { POWER_SENSOR_ID, type Signal } from "@idealo-hw/sensors";
import { RATINGS_COPY } from "../../copy";
import { describeSignal } from "./describe";
import { evidenceTitle } from "./evidence";

interface FlagItem {
  id: string;
  severity: Signal["severity"];
  /** Severity as words, so colour is never the only cue. */
  severityLabel: string;
  label: string;
  detail: string;
  /** The facts the flag rests on, as the tooltip. */
  title: string;
}

interface FeatureItem {
  id: string;
  label: string;
  title: string;
}

export interface SignalsCardView {
  /** Red, amber and info flags, worst first. */
  flags: FlagItem[];
  /** Badges: what the product does well. */
  features: FeatureItem[];
}

const WORST_FIRST: Readonly<Record<Signal["severity"], number>> = { red: 0, amber: 1, info: 2 };

/** The card sections for the product's signals; the power badge has its own row among the CPU rows. */
export function signalsCardOf(signals: readonly Signal[]): SignalsCardView {
  const flags = signals
    .filter((s) => s.kind === "flag")
    .toSorted((a, b) => WORST_FIRST[a.severity] - WORST_FIRST[b.severity])
    .map((s): FlagItem => {
      const { label, detail } = describeSignal(s);
      return {
        id: s.id,
        severity: s.severity,
        severityLabel: RATINGS_COPY.severityLabels[s.severity],
        label,
        detail,
        title: evidenceTitle(s),
      };
    });
  const features = signals
    .filter((s) => s.kind === "badge" && s.sensorId !== POWER_SENSOR_ID)
    .map((s): FeatureItem => {
      const { label, detail } = describeSignal(s);
      return { id: s.id, label, title: detail };
    });
  return { flags, features };
}
