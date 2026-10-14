import { Text, type TextProps } from "@mantine/core";
import type { ReactNode } from "react";

/** `muted` is a status line (`role="status"`), `error` an alert (`role="alert"`, red). */
export type StatusTone = "muted" | "error";

/** One small line reporting the outcome of an action. */
export function StatusNote({
  tone,
  testId,
  children,
  ...props
}: Omit<TextProps, "c" | "fz"> & { tone: StatusTone; testId?: string; children: ReactNode }) {
  return (
    <Text
      {...props}
      fz="xs"
      c={tone === "error" ? "red" : "var(--hw-ink-muted)"}
      role={tone === "error" ? "alert" : "status"}
      {...(testId ? { "data-testid": testId } : {})}
    >
      {children}
    </Text>
  );
}
