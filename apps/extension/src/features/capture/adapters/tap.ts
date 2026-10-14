import { isIdealoHost } from "@idealo-hw/idealo-query/url/host";
import { BatchInterceptor } from "@mswjs/interceptors";
import { FetchInterceptor } from "@mswjs/interceptors/fetch/web";
import { XMLHttpRequestInterceptor } from "@mswjs/interceptors/XMLHttpRequest/web";
import { MAX_BODY_CHARS } from "../config";
import { type CapturedResponse, isJsonText, TAP_SOURCE, type TapMessage } from "../model/protocol";

const hostOf = (url: string, base: string): string | null => {
  try {
    return new URL(url, base).hostname;
  } catch {
    return null;
  }
};

export interface ObservedResponse {
  url: string;
  method: string;
  status: number;
  contentType: string;
  /** Reads the body lazily. May reject (consumed or aborted body). */
  readText(): Promise<string>;
}

/**
 * Responses from idealo hosts become records; anything else (trackers, ads, CDNs) yields null and is
 * never stored, so the ring spans more page views. The body is kept only when the text parses as
 * JSON: the content-type header is not trusted (the real site labels JSON differently).
 */
export async function toCapturedResponse(
  observed: ObservedResponse,
  base = location.href,
  now: () => Date = () => new Date(),
): Promise<CapturedResponse | null> {
  const { url, method, status, contentType } = observed;
  const host = hostOf(url, base);
  if (host === null || !isIdealoHost(host)) return null;
  const meta = { url, method, status, contentType, capturedAt: now().toISOString() };
  try {
    const text = await observed.readText();
    if (isJsonText(text)) {
      return {
        ...meta,
        body: text.slice(0, MAX_BODY_CHARS),
        truncated: text.length > MAX_BODY_CHARS,
        bodyCaptured: true,
      };
    }
  } catch {
    // body already consumed or aborted: fall through to metadata only
  }
  return { ...meta, body: "", truncated: false, bodyCaptured: false };
}

/**
 * Observes fetch/XHR responses on this page. Never answers a request itself, so traffic passes
 * through untouched (ADR 0008: read-only). Only injected while capture mode is on.
 */
export function startNetworkTap(emit: (response: CapturedResponse) => void): () => void {
  const interceptor = new BatchInterceptor({
    name: "idealo-hw-network-tap",
    interceptors: [new FetchInterceptor(), new XMLHttpRequestInterceptor()],
  });

  interceptor.on("response", async ({ request, response }) => {
    const captured = await toCapturedResponse({
      url: request.url,
      method: request.method,
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      readText: () => response.clone().text(),
    });
    if (captured !== null) emit(captured);
  });

  interceptor.apply();
  return () => interceptor.dispose();
}

/** Entry of the MAIN-world content script: posts every captured response to the relay in the isolated world. */
export function startMainWorldTap(): () => void {
  return startNetworkTap((response) => {
    const message: TapMessage = { source: TAP_SOURCE, response };
    window.postMessage(message, location.origin);
  });
}
