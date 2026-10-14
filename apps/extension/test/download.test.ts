// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { basicTimestamp, downloadJson, exportFilename } from "../src/ui/download";

const AT = new Date("2026-10-14T13:38:58.123Z");

describe("export file names", () => {
  it("uses ISO-8601 basic UTC without separators or milliseconds", () => {
    expect(basicTimestamp(AT)).toBe("20261014T133858Z");
  });

  it("names every export idealo-hw_<kind>_<timestamp>.<ext>", () => {
    expect(exportFilename("captures", AT)).toBe("idealo-hw_captures_20261014T133858Z.json");
    expect(exportFilename("page-snapshot", AT, "html")).toBe(
      "idealo-hw_page-snapshot_20261014T133858Z.html",
    );
  });

  it("is independent of the local time zone", () => {
    const late = new Date(Date.UTC(2026, 0, 2, 23, 5, 9));
    expect(basicTimestamp(late)).toBe("20260102T230509Z");
  });
});

describe("downloadJson", () => {
  it("stamps exportedAt as ISO-8601 UTC and returns the file name", async () => {
    let blob: Blob | undefined;
    let name = "";
    URL.createObjectURL = (b) => {
      blob = b as Blob;
      return "blob:test";
    };
    URL.revokeObjectURL = () => undefined;
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      name = this.download;
    };
    try {
      expect(downloadJson("captures", { captures: [1] }, AT)).toBe(
        "idealo-hw_captures_20261014T133858Z.json",
      );
    } finally {
      HTMLAnchorElement.prototype.click = click;
    }
    expect(name).toBe("idealo-hw_captures_20261014T133858Z.json");
    expect(JSON.parse((await blob?.text()) ?? "")).toEqual({
      exportedAt: "2026-10-14T13:38:58.123Z",
      captures: [1],
    });
  });
});
