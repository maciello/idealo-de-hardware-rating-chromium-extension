import type {
  CandidateIndex,
  CpuBenchmarkRecord,
  FormFactor,
  GpuBenchmarkRecord,
  GpuMatcher,
  Matcher,
} from "@idealo-hw/hw-bench";
import type { Decider, DecisionCandidate } from "./decider";

export type ResolutionSource = "deterministic" | "jev" | "none";

export interface Resolution<R> {
  readonly status: "matched" | "ambiguous" | "no_match";
  /** Set when `status` is "matched". */
  readonly record?: R;
  /** Set when `status` is "ambiguous": the deterministic matcher's tied records. */
  readonly candidates?: readonly R[];
  /** 1 for a deterministic match; the decider's confidence when it was consulted; else 0. */
  readonly confidence: number;
  /** Who produced the record: the rules, the decider (a pick above threshold), or nobody. */
  readonly source: ResolutionSource;
  /** Set whenever a decider was consulted. */
  readonly model?: string;
}

interface ResolveBase {
  readonly decider: Decider;
  /** Extra facts for the decider's state, e.g. `{ product_title: "..." }`. */
  readonly context?: Readonly<Record<string, string>>;
  /** Candidates handed to the decider after a no_match. Default 20: fewer options, fewer wrong picks. */
  readonly maxCandidates?: number;
}

export interface ResolveCpuDeps extends ResolveBase {
  readonly matcher: Matcher<CpuBenchmarkRecord>;
  readonly candidates: CandidateIndex<CpuBenchmarkRecord>;
}

export interface ResolveGpuDeps extends ResolveBase {
  readonly matcher: GpuMatcher;
  readonly candidates: CandidateIndex<GpuBenchmarkRecord>;
}

export const DEFAULT_MAX_CANDIDATES = 20;

const CPU_QUESTION =
  "Which PassMark CPU entry is the processor named in `cpu_text`? The text may contain unrelated words " +
  "(product name, display, memory). Pick only an entry with exactly the same model number and suffix " +
  "letters (13700H is not 13700HX; 395 is not 385). If no entry is exactly right, pick none_of_the_above.";

const GPU_QUESTION =
  "Which PassMark GPU entry is the graphics processor named in `gpu_text`? `form_factor` says what kind of " +
  "product it is built into: for a laptop pick the 'Laptop GPU' (mobile) entry when one exists, for a " +
  "desktop pick the desktop card. Pick only an entry with exactly the same model number and suffix " +
  "(Ti, SUPER, XT). If no entry is exactly right, pick none_of_the_above.";

/** CPU ids are unique together with the socket count. */
const cpuId = (record: CpuBenchmarkRecord): string => `${record.id}:${record.socketCount}`;
const gpuId = (record: GpuBenchmarkRecord): string => String(record.id);

const gpuLabel = (record: GpuBenchmarkRecord): string =>
  `${record.name} [${record.segments.join(", ")}]`;

interface Decision<R> {
  readonly record: R | null;
  readonly confidence: number;
  readonly model: string;
}

async function decideAmong<R>(params: {
  readonly decider: Decider;
  readonly records: readonly R[];
  readonly toCandidate: (record: R) => DecisionCandidate;
  readonly state: Readonly<Record<string, string>>;
  readonly question: string;
}): Promise<Decision<R>> {
  const byId = new Map<string, R>();
  for (const record of params.records) {
    const candidate = params.toCandidate(record);
    if (!byId.has(candidate.id)) byId.set(candidate.id, record);
  }
  const choice = await params.decider.chooseRecord({
    state: params.state,
    question: params.question,
    candidates: [...byId.values()].map(params.toCandidate),
  });
  // Only ids that were offered can come back; anything else is treated as no decision.
  const record = choice.chosenId === null ? null : (byId.get(choice.chosenId) ?? null);
  return { record, confidence: choice.confidence, model: choice.model };
}

function fromDecision<R>(
  decision: Decision<R>,
  fallback: Pick<Resolution<R>, "status" | "candidates">,
): Resolution<R> {
  if (decision.record !== null) {
    return {
      status: "matched",
      record: decision.record,
      confidence: decision.confidence,
      source: "jev",
      model: decision.model,
    };
  }
  return { ...fallback, confidence: decision.confidence, source: "none", model: decision.model };
}

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
