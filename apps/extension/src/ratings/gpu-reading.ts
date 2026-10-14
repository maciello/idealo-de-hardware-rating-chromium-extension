import type { GpuMatchRating } from "@idealo-hw/hw-bench";

/** A dedicated card, or the graphics inside the CPU. */
export type GpuKind = "dedicated" | "integrated";

/** Where a memory figure comes from; the chip says so for everything but the tile's own words. */
export type GpuMemorySource =
  /** The tile or datasheet states it ("Grafikspeicher 16 GB"). */
  | "stated"
  /** PassMark's memory size for the matched card: what the card usually has, not what this product has. */
  | "typical"
  /** The graphics share system memory. */
  | "shared";

export interface GpuMemory {
  readonly source: GpuMemorySource;
  /** Null for shared memory. */
  readonly megabytes: number | null;
  /** "GDDR7" when the tile states a memory type; null otherwise. */
  readonly type: string | null;
}

/** One GPU the chip or its card talks about. */
export interface GpuPart {
  readonly kind: GpuKind;
  /** The PassMark record's name; for an unrated iGPU the table's own name for it. */
  readonly name: string;
  /** Null when the GPU is known but PassMark has no rating for it (Apple M-series, Mali). */
  readonly rating: GpuMatchRating | null;
  readonly memory: GpuMemory | null;
  /** The table maps the iGPU to the nearest PassMark row because PassMark lists none for this exact one. */
  readonly approximated: boolean;
}

/**
 * What the chip says about graphics. `primary` is the GPU line: the dedicated card when the tile names one, else the
 * iGPU of the CPU. `companion` is the iGPU of a CPU whose tile also names a card; only the card shows it.
 */
export interface GpuReading {
  readonly primary: GpuPart;
  readonly companion: GpuPart | null;
}
