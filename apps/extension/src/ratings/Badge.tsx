import { Badge, Divider, Group, HoverCard, Stack, Text } from "@mantine/core";
import { IconCpu } from "@tabler/icons-react";
import type { ItemRating } from "./engine";

const labelOf = (labels: ReadonlyMap<string, string>, id: string): string => labels.get(id) ?? id;

function MatchedCard({
  rating,
  labels,
}: {
  rating: Extract<ItemRating, { status: "matched" }>;
  labels: ReadonlyMap<string, string>;
}) {
  return (
    <Stack gap={6} maw={320}>
      <Text size="sm" fw={600}>
        {rating.record.name}
      </Text>
      <Text size="xs" c="dimmed">
        PassMark match via {rating.via === "exact" ? "exact name" : "normalized model key"}
      </Text>
      <Divider />
      {rating.ratings.map((r) => (
        <div key={r.strategyId}>
          <Text size="xs" fw={600}>
            {labelOf(labels, r.strategyId)}: {r.display}
          </Text>
          <Text size="xs" c="dimmed">
            {r.explanation}
          </Text>
        </div>
      ))}
    </Stack>
  );
}

/** Compact CPU rating; renders nothing for no_match (a wrong badge is worse than none, ADR 0007). */
export function RatingBadge({
  rating,
  labels,
}: {
  rating: ItemRating;
  labels: ReadonlyMap<string, string>;
}) {
  if (rating.status === "no_match") return null;
  if (rating.status === "matched" && rating.ratings.length === 0) return null;

  const target =
    rating.status === "matched" ? (
      <Group gap={4} wrap="nowrap" data-testid="rating-badge" data-status="matched">
        <IconCpu size={14} aria-hidden />
        {rating.ratings.map((r) => (
          <Badge key={r.strategyId} size="sm" radius="sm" variant="light" tt="none">
            {r.display}
          </Badge>
        ))}
      </Group>
    ) : (
      <Group gap={4} wrap="nowrap" data-testid="rating-badge" data-status="ambiguous">
        <IconCpu size={14} aria-hidden />
        <Badge size="sm" radius="sm" variant="light" color="gray" tt="none">
          ?
        </Badge>
      </Group>
    );

  return (
    <HoverCard width={320} shadow="md" withArrow openDelay={100} position="bottom-start">
      <HoverCard.Target>
        <div style={{ display: "inline-block", cursor: "default", padding: "2px 0" }}>{target}</div>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        {rating.status === "matched" ? (
          <MatchedCard rating={rating} labels={labels} />
        ) : (
          <Stack gap={4}>
            <Text size="sm" fw={600}>
              Ambiguous CPU: {rating.candidates.length} PassMark candidates
            </Text>
            {rating.candidates.map((c) => (
              <Text key={c.id} size="xs">
                {c.name}
              </Text>
            ))}
          </Stack>
        )}
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
