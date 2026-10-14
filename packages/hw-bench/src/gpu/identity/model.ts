/** GPU model extracted from free text, e.g. vendor=NVIDIA family="GeForce RTX" model="4060 Ti". */
export interface GpuIdentity {
  /** Canonical key without variant markers or memory, e.g. "geforce-rtx-4060-ti". */
  readonly key: string;
  readonly vendor: "NVIDIA" | "AMD" | "Intel";
  readonly family: string;
  readonly model: string;
  /**
   * VRAM in GB when the text states it directly after the model ("RTX 4060 (8GB)", "RTX 4060 Ti 16 GB",
   * "16384 MB"); not part of `key`. System RAM elsewhere in a title ("16GB RAM", "- 16GB DDR4") never counts.
   */
  readonly memoryGb: number | null;
  /** "laptop" when the text itself says Laptop GPU / (Mobile) / Max-Q; null when it says nothing. */
  readonly variant: "laptop" | null;
  /** The text says Max-Q. */
  readonly maxQ: boolean;
  /** Integrated graphics (Radeon nnnM/S, Iris, HD, UHD, Arc): not tied to laptops or desktops. */
  readonly integrated: boolean;
  /** Text left over after the model and known noise words; empty means the text is exactly this GPU. */
  readonly residual: string;
}

/** A model read from the text, with the span it was read from. */
export interface Found {
  readonly start: number;
  readonly end: number;
  readonly vendor: GpuIdentity["vendor"];
  readonly family: string;
  readonly model: string;
}

/** One strategy of the registry: recognises a single model naming scheme. */
export interface GpuExtractor {
  /** Stable name; the registry's order of ids is asserted by a test. */
  readonly id: string;
  readonly extract: (text: string) => Found | null;
}
