import { z } from "zod";
import { ProductTypeSchema, snakeKey } from "./vocab";

export const AGENT_FLAGS = [
  "single_channel_ram",
  "soldered_ram",
  "keyboard_not_german",
  "keyboard_unverified",
  "reseller_modified",
  "refurbished",
  "spec_conflict",
] as const;

const AgentFlagSchema = z
  .enum(AGENT_FLAGS)
  .describe(
    "A problem the agent saw while reading the spec sheet: single_channel_ram, soldered_ram, keyboard_not_german, keyboard_unverified, reseller_modified, refurbished, spec_conflict (sources disagree).",
  );

export type AgentFlag = z.infer<typeof AgentFlagSchema>;

const nullableNumber = (text: string) => z.number().nullable().default(null).describe(text);
const nullableText = (text: string) => z.string().nullable().default(null).describe(text);

const OfferSchema = z
  .object({
    shop: z.string().min(1).describe("Shop name as idealo shows it."),
    price_eur: z.number().min(0).describe("Item price in euro, without shipping."),
    shipping_eur: z.number().min(0).describe("Shipping cost in euro, 0 when free."),
    rating_avg: z
      .number()
      .min(0)
      .max(5)
      .nullable()
      .describe("Shop rating average out of 5, null when idealo shows none."),
    rating_count: z
      .number()
      .int()
      .min(0)
      .nullable()
      .describe("Number of shop ratings, null when idealo shows none."),
    marketplace: z.boolean().describe("True when the offer is sold through a marketplace seller."),
    payments: z
      .array(z.string())
      .describe(
        "idealo costCode values of the payment methods offered: INV (invoice), PP (PayPal), CBC (card), CIA, DD (direct debit), SUW, AMZP, APPLE_PAY, ...",
      ),
  })
  .describe("One shop offer for the laptop.");

export type Offer = z.infer<typeof OfferSchema>;

const DisplaySchema = z
  .object({
    inches: nullableNumber("Screen diagonal in inches."),
    width_px: nullableNumber("Horizontal resolution in pixels."),
    height_px: nullableNumber("Vertical resolution in pixels."),
    nits: nullableNumber("Typical brightness in nits."),
    refresh_hz: nullableNumber("Refresh rate in Hz."),
    panel: z
      .array(z.string())
      .default([])
      .describe(
        'Panel words as idealo writes them, e.g. "IPS", "matt", "OLED", "Touchscreen", "glänzend", "entspiegelt".',
      ),
  })
  .describe("Display facts.");

const WebcamSchema = z
  .object({
    megapixels: nullableNumber("Webcam resolution in megapixels, when the spec sheet states it."),
    height_px: nullableNumber(
      "Webcam vertical resolution (720, 1080). Used for megapixels at 16:9 when megapixels is null.",
    ),
    ir: z.boolean().nullable().default(null).describe("True when the webcam has an IR sensor."),
  })
  .describe("Webcam facts.");

export const CandidateSchema = z
  .object({
    sku: z
      .string()
      .min(1)
      .describe("idealo nameDelta, the model number. Identity key for pooling."),
    name: z.string().min(1).describe("Product name as idealo shows it."),
    url: z.string().min(1).describe("idealo product url."),
    found_by: z
      .array(z.string().min(1))
      .min(1)
      .describe("Ids of the search angles (wants.lenses) that surfaced this laptop."),
    fetched_at: z
      .string()
      .refine((text) => !Number.isNaN(Date.parse(text)), "must be an ISO date")
      .describe("ISO date the data was read from idealo. When a sku repeats, the latest wins."),
    product_type: ProductTypeSchema.default("unknown"),
    offers: z.array(OfferSchema).min(1).describe("Current shop offers, at least one."),
    cpu: nullableText("CPU name as written in the spec, e.g. Intel Core Ultra 7 155H."),
    gpu: nullableText(
      "GPU name as written in the spec. Generic labels such as Intel Arc Graphics are fine.",
    ),
    vram_gb: nullableNumber("Dedicated GPU memory in GB. Leave null for integrated graphics."),
    ram_gb: nullableNumber("Installed RAM in GB."),
    ram_type: nullableText("RAM type, e.g. DDR5, LPDDR5X."),
    ssd_gb: nullableNumber("SSD capacity in GB."),
    display: DisplaySchema.prefault({}),
    webcam: WebcamSchema.prefault({}),
    battery_wh: nullableNumber("Battery capacity in Wh."),
    weight_kg: nullableNumber("Weight in kg."),
    wifi_standard: nullableText("Wi-Fi standard text, e.g. Wi-Fi 7 (802.11be)."),
    ports_text: nullableText("Ports as written in the spec."),
    video_outputs: nullableText("Video outputs as written in the spec."),
    mobile_data: nullableText("Mobile data option (LTE, 5G), null when there is none."),
    os: nullableText("Operating system."),
    listed_since: nullableText('Month idealo first listed the laptop, "YYYY-MM".'),
    test_grade: nullableNumber("German test grade, 1.0 is best, null when untested."),
    bargain_badge_pct: nullableNumber("Percent shown on idealo's bargain badge, null when none."),
    price_history_cents: z
      .array(z.number())
      .default([])
      .describe(
        "idealo priceTrend.history[].price values in cents, oldest first. Empty when unavailable.",
      ),
    agent_flags: z.array(AgentFlagSchema).default([]).describe("Problems the agent noticed."),
    notes: z.array(z.string()).default([]).describe("Free-text notes from the agent."),
    extra: z
      .record(snakeKey("Figure name."), z.number().nullable())
      .default({})
      .describe(
        "Any other figure read off the spec sheet, keyed snake_case, e.g. sensor_mp, optical_zoom_x, refresh_hz, color_gamut_srgb_pct, speaker_w. null when the sheet does not say. Wants can score and filter on these through custom_metrics.",
      ),
    features: z
      .array(z.string().trim().toLowerCase())
      .default([])
      .describe(
        "Yes/no features the agent confirmed, lowercase snake_case, e.g. privacy_shutter, ir_camera, numpad, backlit_keyboard, fingerprint_reader, image_stabilisation, weather_sealed.",
      ),
  })
  .describe("One laptop candidate with its offers and specs.");

export type Candidate = z.output<typeof CandidateSchema>;

export const CandidatesFileSchema = z
  .object({
    candidates: z.array(CandidateSchema).describe("Candidates gathered through the idealo MCP."),
  })
  .describe(
    "A candidates file. Several files can be passed to one run; the same sku in several entries is pooled into one candidate.",
  );
