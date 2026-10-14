import type { FormFactor, GpuBenchmarkRecord } from "@idealo-hw/hw-bench";
import type { DecisionCandidate } from "../port";
import { decideAmong, fromDecision } from "./decision";
import { DEFAULT_MAX_CANDIDATES, type Resolution, type ResolveGpuDeps } from "./model";

const GPU_QUESTION =
  "Which PassMark GPU entry is the graphics processor named in `gpu_text`? `form_factor` says what kind of " +
  "product it is built into: for a laptop pick the 'Laptop GPU' (mobile) entry when one exists, for a " +
  "desktop pick the desktop card. Pick only an entry with exactly the same model number and suffix " +
  "(Ti, SUPER, XT). If no entry is exactly right, pick none_of_the_above.";

const gpuId = (record: GpuBenchmarkRecord): string => String(record.id);

const gpuLabel = (record: GpuBenchmarkRecord): string =>
  `${record.name} [${record.segments.join(", ")}]`;

/** GPU text + form factor -> PassMark record; same flow as `resolveCpu`, with variant-aware matching. */
export async function resolveGpu(
  text: string,
  formFactor: FormFactor,
  deps: ResolveGpuDeps,
): Promise<Resolution<GpuBenchmarkRecord>> {
  const result = deps.matcher.match(text, { formFactor });
  if (result.status === "matched") {
    return { status: "matched", record: result.record, confidence: 1, source: "deterministic" };
  }
  const state = { gpu_text: text, form_factor: formFactor, ...deps.context };
  const toCandidate = (r: GpuBenchmarkRecord): DecisionCandidate => ({
    id: gpuId(r),
    label: gpuLabel(r),
  });

  if (result.status === "ambiguous") {
    const decision = await decideAmong({
      decider: deps.decider,
      records: result.candidates,
      toCandidate,
      state,
      question: GPU_QUESTION,
    });
    return fromDecision(decision, { status: "ambiguous", candidates: result.candidates });
  }

  const found = deps.candidates
    .candidatesFor(text, { limit: deps.maxCandidates ?? DEFAULT_MAX_CANDIDATES })
    .map((c) => c.record);
  if (found.length === 0) return { status: "no_match", confidence: 0, source: "none" };
  const decision = await decideAmong({
    decider: deps.decider,
    records: found,
    toCandidate,
    state,
    question: GPU_QUESTION,
  });
  return fromDecision(decision, { status: "no_match" });
}
