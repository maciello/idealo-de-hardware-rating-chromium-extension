import { Card, Stack, Switch, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { SETTINGS_COPY } from "../copy";

interface StrategiesCardProps {
  strategies: readonly { id: string; label: string }[];
  enabledIds: ReadonlySet<string>;
  onToggle(id: string, on: boolean): void;
  /** Rendered below the switches (the cohort controls). */
  children?: ReactNode;
}

export function StrategiesCard({
  strategies,
  enabledIds,
  onToggle,
  children,
}: StrategiesCardProps) {
  return (
    <Card withBorder padding="md" data-testid="strategies">
      <Stack gap="sm">
        <Title order={4}>{SETTINGS_COPY.strategiesTitle}</Title>
        <Text size="sm" c="dimmed">
          {SETTINGS_COPY.strategiesDescription}
        </Text>
        {strategies.map((strategy) => (
          <Switch
            key={strategy.id}
            label={strategy.label}
            description={strategy.id}
            checked={enabledIds.has(strategy.id)}
            onChange={(event) => onToggle(strategy.id, event.currentTarget.checked)}
            data-testid={`strategy-${strategy.id}`}
          />
        ))}
        {children}
      </Stack>
    </Card>
  );
}
