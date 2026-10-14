import type {
  ChoiceQuestion,
  NoulQuestion,
  Questions,
  SystemOneRequest,
  SystemOneResult,
} from "@typesafe-ai/sdk";
import type { SystemOneClient } from "../src";

/** Tests only: records every request and answers through a handler. Never used by production code. */
export interface FakeClient extends SystemOneClient {
  readonly requests: SystemOneRequest[];
}

type Answers = Record<string, unknown>;

export function fakeClient(
  respond: (request: SystemOneRequest) => Answers,
  model = "typesafe/jev-1.13-20260917",
): FakeClient {
  const requests: SystemOneRequest[] = [];
  const systemOne = ((request: SystemOneRequest<Questions>) => {
    requests.push(structuredClone(request));
    const result = {
      model,
      answers: respond(request),
      usage: { input_tokens: 1, output_tokens: 1 },
    };
    return Promise.resolve(result as SystemOneResult<Questions>);
  }) as SystemOneClient["systemOne"];
  return { requests, systemOne };
}

export const choiceOf = (request: SystemOneRequest, name = "pick"): ChoiceQuestion => {
  const question = request.questions[name];
  if (question?.type !== "choice") throw new Error(`question ${name} is not a choice`);
  return question;
};

export const noulOf = (request: SystemOneRequest, name: string): NoulQuestion => {
  const question = request.questions[name];
  if (question?.type !== "noul") throw new Error(`question ${name} is not a noul`);
  return question;
};

/** A choice answer that picks the option whose description is `label`, with the given confidence. */
export function pickByLabel(request: SystemOneRequest, label: string, confidence: number): Answers {
  const criteria = choiceOf(request).criteria;
  const optionKey = Object.entries(criteria).find(([, description]) => description === label)?.[0];
  if (optionKey === undefined) throw new Error(`no option described as ${label}`);
  const others = Object.keys(criteria).filter((k) => k !== optionKey);
  const rest = others.length === 0 ? 0 : (1 - confidence) / others.length;
  return {
    pick: {
      type: "choice",
      choice: optionKey,
      confidence,
      probabilities: Object.fromEntries([[optionKey, confidence], ...others.map((k) => [k, rest])]),
    },
  };
}

export const pickNone = (request: SystemOneRequest, confidence: number): Answers => {
  const criteria = choiceOf(request).criteria;
  return {
    pick: {
      type: "choice",
      choice: "none_of_the_above",
      confidence,
      probabilities: Object.fromEntries(
        Object.keys(criteria).map((k) => [k, k === "none_of_the_above" ? confidence : 0]),
      ),
    },
  };
};
