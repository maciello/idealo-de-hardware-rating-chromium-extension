import type { BenchmarkSnapshot, BenchmarkSource } from "@idealo-hw/hw-bench";
import { describe, expect, it, vi } from "vitest";
import { importBenchmarkFile } from "../../../../src/features/benchmark-data/adapters/import-pipeline";

const snapshot: BenchmarkSnapshot<{ id: number }> = {
  sourceId: "fake",
  kind: "cpu",
  importedAt: null,
  records: [{ id: 1 }],
  rejected: [],
};

const storedItem = (setValue: () => Promise<void>) => ({
  getValue: vi.fn(),
  setValue,
  removeValue: vi.fn(),
  watch: vi.fn(),
});

describe("importBenchmarkFile", () => {
  it("parses the file text with the import time and stores the snapshot", async () => {
    const parse = vi.fn(() => snapshot);
    const source: BenchmarkSource<{ id: number }> = { id: "fake", kind: "cpu", parse };
    const setValue = vi.fn(async () => {});

    await importBenchmarkFile(new File(["a,b"], "cpu.csv"), source, storedItem(setValue) as never);

    expect(parse).toHaveBeenCalledWith("a,b", { importedAt: expect.any(String) });
    expect(setValue).toHaveBeenCalledWith(snapshot);
  });

  it("stores nothing when the source rejects the file", async () => {
    const source: BenchmarkSource<{ id: number }> = {
      id: "fake",
      kind: "cpu",
      parse: () => {
        throw new Error("bad header");
      },
    };
    const setValue = vi.fn(async () => {});

    await expect(
      importBenchmarkFile(new File(["x"], "x.csv"), source, storedItem(setValue) as never),
    ).rejects.toThrow("bad header");
    expect(setValue).not.toHaveBeenCalled();
  });
});
