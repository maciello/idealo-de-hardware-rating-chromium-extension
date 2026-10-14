import { AiTestResultSchema } from "../../../contracts";
import { aiTestResultItem } from "../../../platform/storage";
import { useStorageItem } from "../../../platform/storage/use-storage-item";
import { formatLocalDateTime } from "../../../ui";
import { AI_COPY } from "../copy";

export interface AiTestView {
  ok: boolean;
  title: string;
  message: string;
}

/** The last "Test AI matching" outcome, worded for display; null until a test has run. */
export function useAiTestResult(): AiTestView | null {
  const [stored] = useStorageItem(aiTestResultItem);
  const parsed = AiTestResultSchema.safeParse(stored);
  if (!parsed.success) return null;
  const result = parsed.data;
  return {
    ok: result.ok,
    title: AI_COPY.testTitle(formatLocalDateTime(result.at)),
    message: result.ok
      ? AI_COPY.testWorking(result.picked, result.latencyMs, result.model)
      : AI_COPY.testFailed(result.error),
  };
}
