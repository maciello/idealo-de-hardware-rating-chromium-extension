import { BatchInterceptor } from "@mswjs/interceptors";
import { XMLHttpRequestInterceptor } from "@mswjs/interceptors/XMLHttpRequest/web";
import { FetchInterceptor } from "@mswjs/interceptors/fetch/web";
import { type CapturedResponse, MAX_BODY_CHARS } from "./protocol";

const isJson = (contentType: string): boolean => /json/i.test(contentType);

const isSameOrigin = (url: string, origin: string): boolean => {
  try {
    return new URL(url, origin).origin === origin;
  } catch {
    return false;
  }
};

/**
 * Observes fetch/XHR responses on this page and reports same-origin JSON ones. Never answers a
 * request itself, so traffic passes through untouched (ADR 0008: read-only).
 */
export function startNetworkTap(
  emit: (response: CapturedResponse) => void,
  origin = location.origin,
): () => void {
  const interceptor = new BatchInterceptor({
    name: "idealo-hw-network-tap",
    interceptors: [new FetchInterceptor(), new XMLHttpRequestInterceptor()],
  });

  interceptor.on("response", async ({ request, response }) => {
    const contentType = response.headers.get("content-type") ?? "";
    if (!isJson(contentType) || !isSameOrigin(request.url, origin)) return;
    try {
      const text = await response.clone().text();
      emit({
        url: request.url,
        method: request.method,
        status: response.status,
        contentType,
        body: text.slice(0, MAX_BODY_CHARS),
        truncated: text.length > MAX_BODY_CHARS,
        capturedAt: new Date().toISOString(),
      });
    } catch {
      // body already consumed or aborted: nothing to report
    }
  });

  interceptor.apply();
  return () => interceptor.dispose();
}
