import { Container, Stack, Text, Title } from "@mantine/core";
import { OpenRouterConnectedCard } from "../../features/ai-matching";
import { CpuImportCard, GpuImportCard } from "../../features/benchmark-data";
import { CaptureConnectedCard } from "../../features/capture";
import { DiagnosticsConnectedCard } from "../../features/diagnostics";
import { StrategiesConnectedCard } from "../../features/settings";
import { OPTIONS_COPY } from "./copy";

export function OptionsScreen() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={2}>{OPTIONS_COPY.title}</Title>
        <Text size="sm" c="dimmed">
          {OPTIONS_COPY.intro}
        </Text>
        <CpuImportCard />
        <GpuImportCard />
        <StrategiesConnectedCard />
        <OpenRouterConnectedCard />
        <CaptureConnectedCard />
        <DiagnosticsConnectedCard />
      </Stack>
    </Container>
  );
}
