export interface RuntimeInfo {
  extensionVersion: string;
  userAgent: string;
}

/** Version of the running extension and the user agent of the browser it runs in. */
export function readRuntimeInfo(): RuntimeInfo {
  return {
    extensionVersion: browser.runtime.getManifest().version,
    userAgent: navigator.userAgent,
  };
}
