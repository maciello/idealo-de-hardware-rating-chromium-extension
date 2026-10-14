import { Card, Stack, Switch, Text, Title } from "@mantine/core";
import { resolveEnabledStrategyIds, STRATEGY_CATALOG } from "../ratings/engine";
import { settingsItem } from "../storage/items";
import { useStorageItem } from "./use-storage-item";

export function StrategiesCard() {
  const [settings, saveSettings] = useStorageItem(settingsItem);
  const enabled = new Set(resolveEnabledStrategyIds(settings?.enabledStrategyIds));

  const toggle = (id: string, on: boolean): void => {
    const next = new Set(enabled);
    if (on) next.add(id);
    else next.delete(id);
    saveSettings({
      ...settings,
      enabledStrategyIds: STRATEGY_CATALOG.map((s) => s.id).filter((known) => next.has(known)),
    });
  };

  return (
    <Card withBorder padding="md" data-testid="strategies">
      <Stack gap="sm">
        <Title order={4}>Rating strategies</Title>
        <Text size="sm" c="dimmed">
          Every enabled strategy renders in the badge, side by side, so you can compare them.
        </Text>
        {STRATEGY_CATALOG.map((strategy) => (
          <Switch
            key={strategy.id}
            label={strategy.label}
            description={strategy.id}
            checked={enabled.has(strategy.id)}
            onChange={(event) => toggle(strategy.id, event.currentTarget.checked)}
            data-testid={`strategy-${strategy.id}`}
          />
        ))}
      </Stack>
    </Card>
  );
}
