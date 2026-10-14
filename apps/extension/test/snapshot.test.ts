// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  capturePageSnapshot,
  capUtf8,
  MAX_SNAPSHOT_BYTES,
  sanitizedClone,
} from "../src/page/snapshot";

const doc = (body: string): Document =>
  new DOMParser().parseFromString(
    `<!doctype html><html><head><title>T</title></head><body>${body}</body></html>`,
    "text/html",
  );

describe("sanitizedClone", () => {
  it("strips script code but keeps JSON-LD and JSON data blocks", () => {
    const html = sanitizedClone(
      doc(`
        <script>window.secret = "token-123";</script>
        <script src="/app.js"></script>
        <script type="application/ld+json">{"@type":"Product"}</script>
        <script type="application/json" id="state">{"a":1}</script>
        <script data-testid="Product">{"name":"X"}</script>
        <script data-flag="1">var notJson = true;</script>
      `).documentElement,
    ).outerHTML;
    expect(html).not.toContain("token-123");
    expect(html).not.toContain("notJson");
    expect(html).toContain('{"@type":"Product"}');
    expect(html).toContain('{"a":1}');
    expect(html).toContain('{"name":"X"}');
    expect(html).toContain('src="/app.js"');
    expect(html).toContain("data-hw-stripped");
  });

  it("removes the extension's own hosts and leaves the live document alone", () => {
    const page = doc(
      `<p>keep</p><idealo-hw-badge></idealo-hw-badge><idealo-hw-overlay></idealo-hw-overlay>`,
    );
    const html = sanitizedClone(page.documentElement).outerHTML;
    expect(html).toContain("keep");
    expect(html).not.toContain("idealo-hw-");
    expect(page.querySelectorAll("idealo-hw-badge")).toHaveLength(1);
  });
});

describe("capturePageSnapshot", () => {
  const NOW = () => new Date("2026-10-14T13:38:58.000Z");

  it("returns url, title, ISO UTC capturedAt and the html", () => {
    const snap = capturePageSnapshot(doc("<p>hi</p>"), "https://www.idealo.de/x.html", NOW);
    expect(snap).toMatchObject({
      url: "https://www.idealo.de/x.html",
      title: "T",
      capturedAt: "2026-10-14T13:38:58.000Z",
      truncated: false,
    });
    expect(snap.html).toContain("<p>hi</p>");
  });

  it("caps the size, marking the snapshot as truncated", () => {
    const snap = capturePageSnapshot(doc(`<p>${"x".repeat(5000)}</p>`), "u", NOW, 1000);
    expect(new TextEncoder().encode(snap.html).length).toBeLessThanOrEqual(1000);
    expect(snap.truncated).toBe(true);
  });

  it("caps at 5 MB by default", () => {
    expect(MAX_SNAPSHOT_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe("capUtf8", () => {
  it("never leaves a half character behind", () => {
    const { text, truncated } = capUtf8("aé€😀".repeat(10), 7);
    expect(truncated).toBe(true);
    expect(new TextEncoder().encode(text).length).toBeLessThanOrEqual(7);
    expect(text).not.toContain("�");
  });

  it("keeps short text intact", () => {
    expect(capUtf8("abc", 10)).toEqual({ text: "abc", truncated: false });
  });
});
