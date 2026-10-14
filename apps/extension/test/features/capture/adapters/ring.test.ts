import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { captureRing } from "../../../../src/features/capture/adapters/ring";
import { RING_CAPACITY } from "../../../../src/features/capture/config";
import type { CapturedResponse } from "../../../../src/features/capture/model/protocol";

const entry = (n: number): CapturedResponse => ({
  url: `https://www.idealo.de/api/${n}.json`,
  method: "GET",
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({ n }),
  truncated: false,
  capturedAt: "2026-10-14T00:00:00.000Z",
});

beforeEach(() => fakeBrowser.reset());

describe("captureRing", () => {
  it("lists entries oldest first", async () => {
    await captureRing.append(entry(1));
    await captureRing.append(entry(2));
    expect((await captureRing.list()).map((e) => e.url)).toEqual([entry(1).url, entry(2).url]);
    expect(await captureRing.count()).toBe(2);
  });

  it("keeps only the newest RING_CAPACITY entries", async () => {
    for (let n = 0; n < RING_CAPACITY + 5; n++) await captureRing.append(entry(n));
    const list = await captureRing.list();
    expect(list).toHaveLength(RING_CAPACITY);
    expect(list[0]?.url).toBe(entry(5).url);
    expect(list.at(-1)?.url).toBe(entry(RING_CAPACITY + 4).url);
    expect(await captureRing.count()).toBe(RING_CAPACITY);
  });

  it("clears everything", async () => {
    await captureRing.append(entry(1));
    await captureRing.clear();
    expect(await captureRing.list()).toEqual([]);
    expect(await captureRing.count()).toBe(0);
  });
});
