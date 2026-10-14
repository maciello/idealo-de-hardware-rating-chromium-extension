export interface PageSnapshot {
  url: string;
  title: string;
  capturedAt: string;
  html: string;
  /** True when the html was cut to fit the snapshot size limit. */
  truncated: boolean;
}
