import { z } from "zod";

/** Fixed tag on every window.postMessage from the MAIN-world tap (ADR 0008). */
export const TAP_SOURCE = "idealo-hw-extension/network-tap";

/** True for text that starts like a JSON object or array and parses; the content-type is not trusted. */
export const isJsonText = (text: string): boolean => {
  const first = text.trimStart()[0];
  if (first !== "{" && first !== "[") return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

export const CapturedResponseSchema = z.object({
  url: z.string(),
  method: z.string(),
  status: z.number().int(),
  contentType: z.string(),
  /** Empty when `bodyCaptured` is false. */
  body: z.string(),
  truncated: z.boolean(),
  /** False for metadata-only records (a body that is not JSON); absent means true. */
  bodyCaptured: z.boolean().optional(),
  capturedAt: z.string(),
});
export type CapturedResponse = z.infer<typeof CapturedResponseSchema>;

export const TapMessageSchema = z.object({
  source: z.literal(TAP_SOURCE),
  response: CapturedResponseSchema,
});
export type TapMessage = z.infer<typeof TapMessageSchema>;
