import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../src/platform/errors", () => ({ recordError: vi.fn(async () => undefined) }));

import { createScanLoop } from "../../../../src/features/ratings/controller/scan-loop";
import { recordError } from "../../../../src/platform/errors";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("createScanLoop", () => {
  it("runs the scan once after the delay, the latest schedule winning", async () => {
    const scan = vi.fn(async () => undefined);
    const loop = createScanLoop(scan);
    loop.schedule(250);
    await vi.advanceTimersByTimeAsync(200);
    loop.schedule(250);
    await vi.advanceTimersByTimeAsync(200);
    expect(scan).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60);
    expect(scan).toHaveBeenCalledTimes(1);
  });

  it("runs once more after a scan when a refresh arrived while it was running", async () => {
    let release: () => void = () => undefined;
    const scan = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const loop = createScanLoop(scan);
    const first = loop.refresh();
    await loop.refresh();
    await loop.refresh();
    expect(scan).toHaveBeenCalledTimes(1);
    release();
    await vi.waitFor(() => expect(scan).toHaveBeenCalledTimes(2));
    release();
    await first;
    expect(scan).toHaveBeenCalledTimes(2);
  });

  it("reports a failing scan and keeps accepting refreshes", async () => {
    const failure = new Error("boom");
    const scan = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue(undefined);
    const loop = createScanLoop(scan);
    await loop.refresh();
    expect(recordError).toHaveBeenCalledWith("content", failure);
    await loop.refresh();
    expect(scan).toHaveBeenCalledTimes(2);
  });

  it("stops a pending run", async () => {
    const scan = vi.fn(async () => undefined);
    const loop = createScanLoop(scan);
    loop.schedule(100);
    loop.stop();
    await vi.advanceTimersByTimeAsync(500);
    expect(scan).not.toHaveBeenCalled();
  });
});
