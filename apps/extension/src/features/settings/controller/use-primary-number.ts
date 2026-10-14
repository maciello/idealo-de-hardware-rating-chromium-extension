import { useMemo } from "react";
import { settingsItem } from "../../../platform/storage";
import { useStorageItem } from "../../../platform/storage/use-storage-item";
import { DEFAULT_PRIMARY_ID, PRIMARY_CHOICES } from "../../ratings";
import { readSettings, withPrimaryStrategy } from "../model";

export interface PrimaryNumberModel {
  choices: readonly { value: string; label: string }[];
  value: string;
  onChange(primaryStrategyId: string): void;
}

const CHOICES = PRIMARY_CHOICES.map((c) => ({ value: c.id, label: c.label }));

/** The strategy whose value is the chip's headline number, persisted in the settings item. */
export function usePrimaryNumber(): PrimaryNumberModel {
  const [stored, save] = useStorageItem(settingsItem);
  const settings = useMemo(() => readSettings(stored), [stored]);
  return {
    choices: CHOICES,
    value: settings?.primaryStrategyId ?? DEFAULT_PRIMARY_ID,
    onChange: (primaryStrategyId) => save(withPrimaryStrategy(settings, primaryStrategyId)),
  };
}
