import type { CpuBenchmarkRecord } from "@idealo-hw/hw-bench";
import type { DecisionCandidate } from "../port";
import { decideAmong, fromDecision } from "./decision";
import { DEFAULT_MAX_CANDIDATES, type Resolution, type ResolveCpuDeps } from "./model";

const CPU_QUESTION =
  "Which PassMark CPU entry is the processor named in `cpu_text`? The text may contain unrelated words " +
  "(product name, display, memory). Pick only an entry with exactly the same model number and suffix " +
  "letters (13700H is not 13700HX; 395 is not 385). If no entry is exactly right, pick none_of_the_above.";

/** CPU ids are unique together with the socket count. */
const cpuId = (record: CpuBenchmarkRecord): string => `${record.id}:${record.socketCount}`;

/**
 * CPU text -> PassMark record. Deterministic matcher first (no network); an ambiguous result goes to the
 * decider over the tied records; no_match goes through the candidate index and then the decider.
 * Decider errors (network, auth) propagate: the caller decides whether to degrade.
 */
export async function resolveCpu(
  text: string,
  deps: ResolveCpuDeps,
): Promise<Resolution<CpuBenchmarkRecord>> {
  const result = deps.matcher.match(text);
  if (result.status === "matched") {
    return { status: "matched", record: result.record, confidence: 1, source: "deterministic" };
  }
  const state = { cpu_text: text, ...deps.context };
  const toCandidate = (r: CpuBenchmarkRecord): DecisionCandidate => ({
    id: cpuId(r),
    label: r.name,
  });

  if (result.status === "ambiguous") {
    const decision = await decideAmong({
      decider: deps.decider,
      records: result.candidates,
      toCandidate,
      state,
      question: CPU_QUESTION,
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
    question: CPU_QUESTION,
  });
  return fromDecision(decision, { status: "no_match" });
}
