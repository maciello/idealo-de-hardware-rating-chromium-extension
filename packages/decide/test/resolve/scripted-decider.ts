import type { SystemOneRequest } from "@typesafe-ai/sdk";
import { createJevDecider } from "../../src";
import { choiceOf, fakeClient, pickByLabel, pickNone } from "../fake-client";

/** Records every call; answers with a scripted choice by label. */
export function scriptedDecider(label: string | null, confidence = 0.9) {
  const client = fakeClient((req: SystemOneRequest) =>
    label === null ? pickNone(req, confidence) : pickByLabel(req, label, confidence),
  );
  return { client, decider: createJevDecider({ client }) };
}

export const labelsAsked = (client: ReturnType<typeof fakeClient>): string[] =>
  Object.values(choiceOf(client.requests[0] as SystemOneRequest).criteria)
    .map(String)
    .filter((l) => !l.startsWith("None of"))
    .sort();
