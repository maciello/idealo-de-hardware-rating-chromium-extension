// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { LabeledRow, Meter, MutedText, StatusNote } from "../../../src/ui";

window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
    onchange: null,
  }) as MediaQueryList;

afterEach(cleanup);

const wrap = (node: ReactNode) => render(<MantineProvider>{node}</MantineProvider>);

describe("Meter", () => {
  it("lights `filled` of five segments and is decorative without a label", () => {
    const { container } = wrap(<Meter filled={3} testId="m" />);
    const meter = screen.getByTestId("m");
    expect(meter.getAttribute("data-filled")).toBe("3");
    expect(meter.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll("i")).toHaveLength(5);
    expect(container.querySelectorAll("i[data-on]")).toHaveLength(3);
  });

  it("becomes a labelled image when given a label", () => {
    wrap(<Meter filled={1} label="top 10%" />);
    expect(screen.getByRole("img", { name: "top 10%" })).toBeTruthy();
  });
});

describe("StatusNote", () => {
  it("is a status for muted notes and an alert for errors", () => {
    wrap(
      <>
        <StatusNote tone="muted" testId="note">
          saved
        </StatusNote>
        <StatusNote tone="error">failed</StatusNote>
      </>,
    );
    expect(screen.getByTestId("note").getAttribute("role")).toBe("status");
    expect(screen.getByRole("alert").textContent).toBe("failed");
  });
});

describe("MutedText and LabeledRow", () => {
  it("renders the label and content, stacked or beside each other", () => {
    wrap(
      <>
        <MutedText data-testid="muted">quiet</MutedText>
        <LabeledRow label="Side">beside</LabeledRow>
        <LabeledRow label="Top" stacked>
          above
        </LabeledRow>
      </>,
    );
    expect(screen.getByTestId("muted").textContent).toBe("quiet");
    for (const text of ["Side", "beside", "Top", "above"])
      expect(screen.getByText(text)).toBeTruthy();
  });
});
