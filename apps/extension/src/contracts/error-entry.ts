import { z } from "zod";

/** One line of the persistent error log; also the shape the debug report lists. */
export const ErrorEntrySchema = z.object({
  at: z.iso.datetime(),
  where: z.enum(["background", "content", "options", "popup"]),
  message: z.string(),
  /** First lines of the stack; empty when the thrown value had none. */
  stack: z.string(),
});
export type ErrorEntry = z.infer<typeof ErrorEntrySchema>;
