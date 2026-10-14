import { parseIdealoUrl } from "@idealo-hw/idealo-query";
import { useEffect, useState } from "react";
import { sendMessage } from "../../platform/messaging";
import { activateTab, findTargetTab, type TargetTab } from "../../platform/tabs";
import { type PageStatus, pageSummary } from "./page-summary";

export interface PageStatusView {
  tab: TargetTab | null;
  summary: string;
  canFilter: boolean;
  openFilterBuilder: () => Promise<void>;
}

/** The idealo tab the popup talks about, what its content script reports, and the filter-builder action. */
export function usePageStatus(): PageStatusView {
  const [tab, setTab] = useState<TargetTab | null>(null);
  const [stats, setStats] = useState<PageStatus>("loading");

  useEffect(() => {
    let active = true;
    void (async () => {
      const found = await findTargetTab();
      if (!active) return;
      setTab(found);
      if (found === null) return setStats(null);
      try {
        const result = await sendMessage("getPageStats", undefined, found.id);
        if (active) setStats(result);
      } catch {
        if (active) setStats(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const canFilter = tab !== null && ["category", "search"].includes(parseIdealoUrl(tab.url).kind);
  const openFilterBuilder = async (): Promise<void> => {
    if (tab === null) return;
    try {
      await sendMessage("openFilterBuilder", undefined, tab.id);
      await activateTab(tab.id);
      window.close();
    } catch {
      setStats(null);
    }
  };

  return { tab, summary: pageSummary(tab, stats), canFilter, openFilterBuilder };
}
