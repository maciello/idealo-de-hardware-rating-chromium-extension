import { z } from "zod";

/** Ids arrive as strings or integers on the wire; this reads both as the string form. */
export const numericString = z
  .union([z.string(), z.number().int().nonnegative()])
  .transform(String);
