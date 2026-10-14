import { z } from "zod";
import { type AiTestResult, AiTestResultSchema } from "../storage/ai-test-result";
import type { CpuSnapshot, GpuSnapshot } from "../storage/items";
import type { OpenRouterStatus } from "../storage/openrouter-status";
import type { Settings } from "../storage/schemas";
import { type ErrorEntry, ErrorEntrySchema } from "./error-log";
import { type PageReport, PageReportSchema } from "./page-report";

const DataStatusSchema = z.object({
  records: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
  importedAt: z.string().nullable(),
  sourceId: z.string(),
});

/**
 * The file a user sends back when something does not work. Every field is listed here and filled
 * from named inputs in `buildDebugReport`: there is no path from storage to this file that is not
 * an allowlisted field, so keys, tokens, benchmark records and page HTML cannot leak into it.
 */
export const DebugReportSchema = z.object({
  extensionVersion: z.string(),
  userAgent: z.string(),
  settings: z.object({
    enabledStrategyIds: z.array(z.string()),
    primaryStrategyId: z.string().nullable(),
    captureMode: z.boolean(),
  }),
  ai: z.object({
    connected: z.boolean(),
    lastTest: AiTestResultSchema.nullable(),
  }),
  benchmarkData: z.object({
    cpu: DataStatusSchema.nullable(),
    gpu: DataStatusSchema.nullable(),
  }),
  errors: z.array(ErrorEntrySchema),
  /** The active idealo tab; null with `pageNote` saying why. */
  page: PageReportSchema.nullable(),
  pageNote: z.string().nullable(),
});
export type DebugReport = z.infer<typeof DebugReportSchema>;

export interface DebugReportInput {
  extensionVersion: string;
  userAgent: string;
  /** Enabled strategy ids after resolving "never saved" against the catalog. */
  enabledStrategyIds: readonly string[];
  settings: Settings | null;
  captureMode: boolean;
  openrouter: OpenRouterStatus;
  aiTest: AiTestResult | null;
  cpu: CpuSnapshot | null;
  gpu: GpuSnapshot | null;
  errors: ErrorEntry[];
  page: PageReport | null;
  pageNote: string | null;
}

const dataStatus = (
  snapshot: CpuSnapshot | GpuSnapshot | null,
): z.infer<typeof DataStatusSchema> | null =>
  snapshot === null
    ? null
    : {
        records: snapshot.records.length,
        rejected: snapshot.rejected.length,
        importedAt: snapshot.importedAt,
        sourceId: snapshot.sourceId,
      };

export function buildDebugReport(input: DebugReportInput): DebugReport {
  return DebugReportSchema.parse({
    extensionVersion: input.extensionVersion,
    userAgent: input.userAgent,
    settings: {
      enabledStrategyIds: [...input.enabledStrategyIds],
      primaryStrategyId: input.settings?.primaryStrategyId ?? null,
      captureMode: input.captureMode,
    },
    ai: { connected: input.openrouter.connected, lastTest: input.aiTest },
    benchmarkData: { cpu: dataStatus(input.cpu), gpu: dataStatus(input.gpu) },
    errors: input.errors,
    page: input.page,
    pageNote: input.pageNote,
  });
}
