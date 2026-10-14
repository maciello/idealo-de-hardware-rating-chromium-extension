import { type ElementProps, Text, type TextProps } from "@mantine/core";

/** Secondary text: the muted ink token instead of an ad-hoc color. */
export function MutedText(props: Omit<TextProps, "c"> & ElementProps<"p", "color">) {
  return <Text {...props} c="var(--hw-ink-muted)" />;
}
