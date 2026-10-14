import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { MAX_ERRORS, readErrorLog, recordError } from "../src/diagnostics/error-log";

beforeEach(() => fakeBrowser.reset());

const NOW = new Date("2026-10-14T10:00:00.000Z");

describe("error log", () => {
  it("records where, when, message and the first five stack lines", async () => {
    const error = new Error("boom");
    error.stack = ["Error: boom", ...Array.from({ length: 9 }, (_, i) => `    at frame${i}`)].join(
      "\n",
    );
    await recordError("background", error, NOW);
    const [entry] = await readErrorLog();
    expect(entry).toEqual({
      at: "2026-10-14T10:00:00.000Z",
      where: "background",
      message: "boom",
      stack: "Error: boom\n    at frame0\n    at frame1\n    at frame2\n    at frame3",
    });
  });

  it("accepts thrown values that are not errors", async () => {
    await recordError("popup", "plain string", NOW);
    expect(await readErrorLog()).toMatchObject([
      { where: "popup", message: "plain string", stack: "" },
    ]);
  });

  it("keeps the newest MAX_ERRORS entries, oldest first", async () => {
    for (let n = 0; n < MAX_ERRORS + 3; n++) await recordError("content", new Error(`e${n}`), NOW);
    const log = await readErrorLog();
    expect(log).toHaveLength(MAX_ERRORS);
    expect(log[0]?.message).toBe("e3");
    expect(log.at(-1)?.message).toBe(`e${MAX_ERRORS + 2}`);
  });

  it("never lets an OpenRouter key into the log", async () => {
    await recordError("options", new Error("401 for key sk-or-v1-abc123_DEF-456"), NOW);
    expect(JSON.stringify(await readErrorLog())).not.toContain("sk-or-v1");
  });

  it("drops stored entries that fail validation", async () => {
    await recordError("popup", "ok", NOW);
    await fakeBrowser.storage.local.set({ errorLog: [{ where: "nowhere" }, "junk"] });
    expect(await readErrorLog()).toEqual([]);
  });
});
