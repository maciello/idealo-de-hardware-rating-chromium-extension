import { z } from "zod";

/** Documented examples; product_type is a free lowercase string. */
export const PRODUCT_TYPE_EXAMPLES = [
  "business",
  "multimedia",
  "gaming",
  "convertible",
  "unknown",
] as const;

export const ProductTypeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .describe(
    `Product class, lowercase free text. Laptop examples: ${PRODUCT_TYPE_EXAMPLES.join(", ")}. Use unknown when the page does not say.`,
  );

const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;

export const snakeKey = (text: string) =>
  z.string().regex(SNAKE_CASE, "must be lowercase snake_case, e.g. sensor_mp").describe(text);
