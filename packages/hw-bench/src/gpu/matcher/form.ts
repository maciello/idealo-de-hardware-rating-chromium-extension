import type { GpuBenchmarkRecord } from "../../benchmark";
import type { GpuIdentity } from "../identity";
import type { RecordForm } from "./types";

/**
 * The name says Laptop GPU / (Mobile) / Max-Q, or PassMark files the card under Mobile only. Integrated graphics
 * carry no form factor through PassMark's category (the same iGPU is benchmarked in laptops and desktops).
 */
export function formOf(record: GpuBenchmarkRecord, identity: GpuIdentity): RecordForm {
  if (identity.variant === "laptop") return "laptop";
  if (identity.integrated) return "neutral";
  const mobile = record.segments.includes("mobile");
  const desktop = record.segments.includes("desktop");
  if (mobile && !desktop) return "laptop";
  if (desktop && !mobile) return "desktop";
  return "neutral";
}
