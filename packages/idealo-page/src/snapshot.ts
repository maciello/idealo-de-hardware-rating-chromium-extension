export interface PageSnapshot {
  url: string;
  title: string;
  capturedAt: string;
  html: string;
  /** True when the html was cut to fit the snapshot size limit. */
  truncated: boolean;
}

export const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024;
const MAX_DATA_JSON_CHARS = 2_000_000;

/** Tag-name prefix of the custom elements the extension injects into the page. */
const DEFAULT_HOST_PREFIX = "idealo-hw-";

const isJson = (text: string): boolean => {
  const first = text.trimStart()[0];
  if (text.length > MAX_DATA_JSON_CHARS || (first !== "{" && first !== "[")) return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

/** JSON-LD / application/json blocks, and any script carrying a data-* attribute whose body is JSON. */
function keepsContents(script: Element): boolean {
  if (/json/i.test(script.getAttribute("type") ?? "")) return true;
  const hasData = script.getAttributeNames().some((name) => name.startsWith("data-"));
  return hasData && isJson(script.textContent ?? "");
}

/**
 * Copy of the page without the extension's own UI (elements whose tag starts with `hostPrefix`)
 * and without script code (JSON data blocks stay).
 */
export function sanitizedClone(root: Element, hostPrefix: string = DEFAULT_HOST_PREFIX): Element {
  // SAFETY: cloneNode returns a node of the receiver's own kind, here an Element (lib.dom types it as Node).
  const clone = root.cloneNode(true) as Element;
  for (const element of clone.querySelectorAll("*")) {
    if (element.localName.startsWith(hostPrefix)) element.remove();
  }
  for (const script of clone.querySelectorAll("script")) {
    if (keepsContents(script)) continue;
    const length = script.textContent?.length ?? 0;
    script.textContent = "";
    if (length > 0) script.setAttribute("data-hw-stripped", String(length));
  }
  return clone;
}

/** Cuts to at most `maxBytes` of UTF-8 without leaving a broken trailing character. */
export function capUtf8(text: string, maxBytes: number): { text: string; truncated: boolean } {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length <= maxBytes) return { text, truncated: false };
  const cut = new TextDecoder("utf-8").decode(bytes.subarray(0, maxBytes)).replace(/�+$/, "");
  return { text: cut, truncated: true };
}

export interface SnapshotOptions {
  now?: () => Date;
  maxBytes?: number;
  /** Tag-name prefix of the extension's own elements, dropped from the copy. */
  hostPrefix?: string;
}

export function capturePageSnapshot(
  doc: Document,
  url: string,
  { now = () => new Date(), maxBytes = MAX_SNAPSHOT_BYTES, hostPrefix }: SnapshotOptions = {},
): PageSnapshot {
  const clone = sanitizedClone(doc.documentElement, hostPrefix);
  const { text, truncated } = capUtf8(clone.outerHTML, maxBytes);
  return { url, title: doc.title, capturedAt: now().toISOString(), html: text, truncated };
}
