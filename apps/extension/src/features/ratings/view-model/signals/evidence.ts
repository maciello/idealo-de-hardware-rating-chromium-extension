import type { Evidence, EvidenceValue, Signal, VideoOutput } from "@idealo-hw/sensors";
import { formatInteger } from "../../../../ui/format";
import { EVIDENCE_COPY as E } from "../../copy";

const outputName = (output: VideoOutput): string => {
  if (output.kind !== "hdmi") return E.outputs[output.kind];
  return output.version === null ? E.outputs.hdmi : E.outputs.hdmiVersion(output.version);
};

/** Watts are whole numbers; every other quantity reads as the sensor stated it. */
const amountOf = (value: Extract<EvidenceValue, { kind: "quantity" }>): string =>
  value.unit === "W" ? formatInteger(value.amount) : String(value.amount);

const valueText = (value: EvidenceValue): string => {
  switch (value.kind) {
    case "quantity":
      return E.quantity(amountOf(value), value.unit);
    case "generation":
      return E.generation[value.family](value.generation);
    case "year":
      return String(value.year);
    case "ram_type":
      return value.label;
    case "storage":
      return E.storage[value.storage];
    case "os":
      return E.os[value.os];
    case "video_outputs":
      return value.outputs.map(outputName).join(E.outputs.separator);
    case "answer":
      return value.yes ? E.answer.yes : E.answer.no;
    case "tdp_source":
      return value.source;
  }
};

const lineOf = ({ field, value }: Evidence): string =>
  E.line(E.fieldLabels[field] ?? field, valueText(value));

/** The facts a signal rests on, one line each: the tooltip of its row. */
export const evidenceTitle = (signal: Pick<Signal, "evidence">): string =>
  signal.evidence.map(lineOf).join(E.separator);
