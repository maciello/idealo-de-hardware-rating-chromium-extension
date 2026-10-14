import { z } from "zod";

export const SettingsSchema = z.object({
  /** Ids of hw-bench strategies that render in badges. */
  enabledStrategyIds: z.array(z.string()),
  /** Strategy whose value is the chip's headline number; absent = multi-thread score. */
  primaryStrategyId: z.string().optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;
