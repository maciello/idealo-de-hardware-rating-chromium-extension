import { settingsItem } from "../../../platform/storage";
import { useStorageItem } from "../../../platform/storage/use-storage-item";
import { resolveEnabledStrategyIds, STRATEGY_CATALOG } from "../../ratings";
import { withStrategyToggled } from "../model";

export interface StrategiesModel {
  strategies: readonly { id: string; label: string }[];
  enabledIds: ReadonlySet<string>;
  toggle(id: string, on: boolean): void;
}

/** Which rating strategies render in the badge, persisted in the settings item. */
export function useStrategies(): StrategiesModel {
  const [settings, saveSettings] = useStorageItem(settingsItem);
  const catalogIds = STRATEGY_CATALOG.map((s) => s.id);
  return {
    strategies: STRATEGY_CATALOG,
    enabledIds: new Set(resolveEnabledStrategyIds(settings?.enabledStrategyIds)),
    toggle: (id, on) => saveSettings(withStrategyToggled(settings, catalogIds, id, on)),
  };
}
