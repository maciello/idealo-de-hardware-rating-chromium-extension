import { Accordion, Code, Stack } from "@mantine/core";
import { FILTERS_COPY } from "../copy";

export interface SelectionDetailsProps {
  summary: string;
  url: string;
}

/** Accordion item with the selection in words and the link it opens. */
export function SelectionDetails({ summary, url }: SelectionDetailsProps) {
  return (
    <Accordion.Item value="details">
      <Accordion.Control data-testid="details-toggle">
        {FILTERS_COPY.detailsTitle}
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap={4}>
          <Code block data-testid="summary">
            {summary}
          </Code>
          <Code
            block
            data-testid="target-url"
            style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}
          >
            {url}
          </Code>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
