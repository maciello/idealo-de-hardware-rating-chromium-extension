export interface TargetTab {
  id: number;
  url: string;
}

const IDEALO_ORIGIN = "https://www.idealo.de/";

const idealoTab = (tab: { id?: number | undefined; url?: string | undefined }): TargetTab | null =>
  tab.id !== undefined && tab.url?.startsWith(IDEALO_ORIGIN) ? { id: tab.id, url: tab.url } : null;

/**
 * The idealo tab the popup talks about. In a real popup that is the active tab of the window.
 * When the popup page is open as a tab itself (`tabs.getCurrent` answers only then), the most
 * recently used idealo tab stands in for it.
 */
export async function findTargetTab(): Promise<TargetTab | null> {
  if (await browser.tabs.getCurrent()) {
    const tabs = await browser.tabs.query({ url: `${IDEALO_ORIGIN}*` });
    const newest = tabs.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
    return newest ? idealoTab(newest) : null;
  }
  const [active] = await browser.tabs.query({ active: true, currentWindow: true });
  return active ? idealoTab(active) : null;
}
