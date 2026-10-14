import { passmarkCpuSource } from "@idealo-hw/hw-bench";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { recordError } from "../src/diagnostics/error-log";
import { collectDebugReport } from "../src/diagnostics/export";
import type { PageReport } from "../src/diagnostics/page-report";
import { aiTestResultItem } from "../src/storage/ai-test-result";
import { captureModeItem, cpuSnapshotItem, settingsItem } from "../src/storage/items";
import { openrouterKeyItem, saveOpenRouterCredentials } from "../src/storage/openrouter-key";

const KEY = "sk-or-v1-0123456789abcdef";
const SESSION = ["session", "Info"].join("");

const pageReport: PageReport = {
  url: "https://www.idealo.de/preisvergleich/ProductCategory/3751.html",
  kind: "listing",
  adapterId: "idealo_ssr",
  tiles: 4,
  tilesWithProductId: 3,
  tilesMatchedToPayload: 3,
  tilesRated: 2,
  unrated: [{ title: "Acer Nitro", text: "AMD Ryzen 7 260" }],
  payload: { present: true, categoryId: "3751", resultCount: 53609, error: null },
};

const answer = vi.hoisted(() => ({ page: undefined as unknown }));
vi.mock("../src/messaging", () => ({
  sendMessage: vi.fn(async () => {
    if (answer.page === undefined) throw new Error("no receiver");
    return answer.page;
  }),
}));

const TAB = { id: 7, url: "https://www.idealo.de/preisvergleich/ProductCategory/3751.html" };

beforeEach(async () => {
  fakeBrowser.reset();
  vi.spyOn(fakeBrowser.runtime, "getManifest").mockReturnValue({
    manifest_version: 3,
    name: "idealo Hardware Rating",
    version: "0.1.0",
  });
  answer.page = pageReport;
  await saveOpenRouterCredentials({
    key: KEY,
    userId: "user_1",
    obtainedAt: "2026-10-14T09:00:00.000Z",
  });
  await aiTestResultItem.setValue({
    ok: true,
    at: "2026-10-14T09:30:00.000Z",
    picked: "Intel Core i5-13400",
    expected: "Intel Core i5-13400",
    confidence: 0.98,
    latencyMs: 812,
    model: "typesafe/jev-1.13-20260917",
    error: null,
  });
  await captureModeItem.setValue(true);
  await settingsItem.setValue({
    enabledStrategyIds: ["raw_multithread_score"],
    primaryStrategyId: "raw_multithread_score",
    apiToken: "tok-should-not-travel",
  } as never);
  await cpuSnapshotItem.setValue(
    passmarkCpuSource.parse(
      JSON.stringify({
        data: [
          {
            id: "1",
            name: "Intel Core i7-13700H",
            cpumark: "28,000",
            thread: "3,900",
            cat: "Laptop",
            cpuCount: 1,
            cores: "6",
            logicals: "2",
            secondaryCores: "8",
            secondaryLogicals: "1",
            date: "Jan 2023",
          },
        ],
      }),
      { importedAt: "2026-10-14T08:00:00.000Z" },
    ),
  );
  await fakeBrowser.storage.local.set({
    capture: `{"body":"${SESSION}=1"}`,
    "capture:0": { body: `${SESSION}=1` },
  });
  await recordError("background", new Error(`request failed for ${KEY}`));
});

describe("collectDebugReport", () => {
  it("contains the allowlisted facts", async () => {
    const report = await collectDebugReport(TAB);
    expect(report.settings).toEqual({
      enabledStrategyIds: ["raw_multithread_score"],
      primaryStrategyId: "raw_multithread_score",
      cohortPolicy: { yearCutoff: { kind: "rolling", years: 5 }, minScore: null },
      captureMode: true,
    });
    expect(report.ai).toMatchObject({
      connected: true,
      lastTest: { ok: true, latencyMs: 812, model: "typesafe/jev-1.13-20260917" },
    });
    expect(report.benchmarkData).toEqual({
      cpu: {
        records: 1,
        rejected: 0,
        importedAt: "2026-10-14T08:00:00.000Z",
        sourceId: "passmark_cpu",
      },
      gpu: null,
    });
    expect(report.errors).toHaveLength(1);
    expect(report.page).toEqual(pageReport);
    expect(report.pageNote).toBeNull();
    expect(report.extensionVersion).toBe("0.1.0");
  });

  it("never contains the OpenRouter key, session data, tokens or benchmark records", async () => {
    const text = JSON.stringify(await collectDebugReport(TAB));
    expect(await openrouterKeyItem.getValue()).toMatchObject({ key: KEY });
    expect(text).not.toContain(KEY);
    expect(text).not.toContain("sk-or-");
    expect(text).not.toMatch(new RegExp(SESSION, "i"));
    expect(text).not.toContain("tok-should-not-travel");
    expect(text).not.toContain("Intel Core i7-13700H");
  });

  it("says why there is no page section", async () => {
    expect((await collectDebugReport(null)).pageNote).toBe("No idealo tab was open.");
    answer.page = undefined;
    expect(await collectDebugReport(TAB)).toMatchObject({
      page: null,
      pageNote: "The idealo tab did not answer; reload it and try again.",
    });
    answer.page = { nonsense: true };
    expect((await collectDebugReport(TAB)).pageNote).toBe(
      "The page answered with an unreadable report.",
    );
  });
});
