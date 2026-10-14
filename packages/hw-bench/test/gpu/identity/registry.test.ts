import { describe, expect, it } from "vitest";
import { GPU_EXTRACTORS } from "../../../src/gpu/identity/registry";

describe("GPU_EXTRACTORS", () => {
  it("keeps the evaluation order, which decides ties between matches at the same span", () => {
    expect(GPU_EXTRACTORS.map((extractor) => extractor.id)).toEqual([
      "geforce",
      "radeon-rx",
      "radeon-integrated",
      "arc",
      "iris-xe",
      "hd-graphics",
      "iris",
      "uhd",
      "rtx-ada",
      "rtx-a",
      "rtx-pro",
      "quadro-t",
    ]);
  });

  it("gives every extractor a unique id", () => {
    const ids = GPU_EXTRACTORS.map((extractor) => extractor.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
