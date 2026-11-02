import { CandidatesFileSchema, WantsSchema } from "@idealo-hw/deal-rank";
import { z } from "zod";

/** JSON Schema of both input files, generated from the zod schemas. Optional fields are those with defaults. */
export const inputSchemas = () => ({
  wants: z.toJSONSchema(WantsSchema, { io: "input" }),
  candidates: z.toJSONSchema(CandidatesFileSchema, { io: "input" }),
});
