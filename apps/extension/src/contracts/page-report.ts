import { PageKindSchema } from "@idealo-hw/idealo-page";
import { z } from "zod";

export const MAX_UNRATED = 20;

const count = z.number().int().nonnegative();

const InspectedItemSchema = z.object({
  adapterId: z.string(),
  productId: z.string().nullable(),
  /** Whether the spec text came from the page's embedded payload or from the rendered markup. */
  textSource: z.enum(["embedded", "dom"]),
  title: z.string(),
  text: z.string(),
  rated: z.boolean(),
});
export type InspectedItem = z.infer<typeof InspectedItemSchema>;

/** What the ratings controller read on the page and which items it could rate. */
const PageInspectionSchema = z.object({
  kind: PageKindSchema,
  items: z.array(InspectedItemSchema),
});
export type PageInspection = z.infer<typeof PageInspectionSchema>;

/** The active idealo tab's part of the debug report: counts and a few unrated examples, no HTML. */
export const PageReportSchema = z.object({
  url: z.string(),
  kind: PageKindSchema,
  adapterId: z.string().nullable(),
  /** Items the adapter found: tiles on a listing, the product itself on a product page. */
  tiles: count,
  tilesWithProductId: count,
  tilesMatchedToPayload: count,
  tilesRated: count,
  unrated: z.array(z.object({ title: z.string(), text: z.string() })).max(MAX_UNRATED),
  payload: z.object({
    present: z.boolean(),
    categoryId: z.string().nullable(),
    resultCount: count.nullable(),
    /** Why a present payload could not be read. */
    error: z.string().nullable(),
  }),
});
export type PageReport = z.infer<typeof PageReportSchema>;
