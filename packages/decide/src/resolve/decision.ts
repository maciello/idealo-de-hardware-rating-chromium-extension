import type { Decider, DecisionCandidate } from "../port";
import type { Resolution } from "./model";

export interface Decision<R> {
  readonly record: R | null;
  readonly confidence: number;
  readonly model: string;
}

export async function decideAmong<R>(params: {
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

export function fromDecision<R>(
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
