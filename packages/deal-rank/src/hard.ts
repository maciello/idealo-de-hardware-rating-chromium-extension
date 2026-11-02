import { z } from "zod";
import { ProductTypeSchema, snakeKey } from "./vocab";

const num = (text: string) => z.number().optional().describe(text);

const CustomLimitSchema = z.object({
  key: snakeKey("Key of a figure in the candidates' extra map."),
  min: num("Exclude candidates whose figure is below this."),
  max: num("Exclude candidates whose figure is above this."),
});

export const HardSchema = z
  .object({
    ram_gb_min: num("Exclude candidates with less RAM than this, in GB."),
    webcam_mp_min: num("Exclude candidates whose webcam has fewer megapixels than this."),
    display_nits_min: num("Exclude candidates whose display is dimmer than this, in nits."),
    refresh_hz_min: num("Exclude candidates whose display refresh rate is below this, in Hz."),
    ssd_gb_min: num("Exclude candidates with a smaller SSD than this, in GB."),
    weight_kg_max: num("Exclude candidates heavier than this, in kg."),
    battery_wh_min: num("Exclude candidates with a smaller battery than this, in Wh."),
    vram_gb_min: num("Exclude candidates with less dedicated GPU memory than this, in GB."),
    ai_memory_gb_min: num(
      "Exclude candidates whose estimated memory for local AI models is below this, in GB. The estimate is dedicated VRAM, or 75% of RAM on unified-memory chips.",
    ),
    require_dedicated_gpu: z
      .boolean()
      .optional()
      .describe("When true, exclude candidates without a dedicated GPU."),
    product_types_allowed: z
      .array(ProductTypeSchema)
      .optional()
      .describe("Exclude candidates whose product_type is not in this list."),
    custom: z
      .array(CustomLimitSchema)
      .default([])
      .describe(
        "Limits on figures from the candidates' extra map. A candidate without the figure is flagged unverified_custom_<key>, not excluded.",
      ),
  })
  .describe(
    "Hard filters. A candidate that fails one is excluded with a reason. A missing value never excludes: the candidate gets an unverified_<check> flag instead.",
  );
