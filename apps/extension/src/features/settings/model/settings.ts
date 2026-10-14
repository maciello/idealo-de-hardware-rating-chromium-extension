import { type Settings, SettingsSchema } from "../../../contracts";
import { resolveEnabledStrategyIds } from "../../ratings";

/** Stored settings re-validated on read; null when never saved or unreadable. */
export function readSettings(stored: unknown): Settings | null {
  const parsed = SettingsSchema.safeParse(stored);
  return parsed.success ? parsed.data : null;
}

/** Settings with one strategy switched on or off, kept in catalog order. */
export function withStrategyToggled(
  settings: Settings | null | undefined,
  catalogIds: readonly string[],
  id: string,
  on: boolean,
): Settings {
  const next = new Set(resolveEnabledStrategyIds(settings?.enabledStrategyIds));
  if (on) next.add(id);
  else next.delete(id);
  return { ...settings, enabledStrategyIds: catalogIds.filter((known) => next.has(known)) };
}

/** Settings with another headline number; the enabled strategies are saved resolved. */
export function withPrimaryStrategy(
  settings: Settings | null,
  primaryStrategyId: string,
): Settings {
  return {
    ...settings,
    enabledStrategyIds: resolveEnabledStrategyIds(settings?.enabledStrategyIds),
    primaryStrategyId,
  };
}
