import type { FilterId } from "@idealo-hw/idealo-query";
import { Accordion, Checkbox, ScrollArea, Stack, Text, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { PICKER_MAX_HEIGHT } from "../config";
import { FILTERS_COPY } from "../copy";
import type { FilterViewModel } from "../view-model";

export interface FilterPickerProps {
  picker: FilterViewModel["picker"];
  onSearch: (text: string) => void;
  onToggle: (filterId: FilterId) => void;
}

/** Accordion item that lists every filter option of the category, searchable by name. */
export function FilterPicker({ picker, onSearch, onToggle }: FilterPickerProps) {
  return (
    <Accordion.Item value="options">
      <Accordion.Control data-testid="options-toggle">{FILTERS_COPY.pickerTitle}</Accordion.Control>
      <Accordion.Panel>
        <Stack gap="xs">
          <TextInput
            placeholder={FILTERS_COPY.pickerSearch}
            leftSection={<IconSearch size={16} />}
            value={picker.search}
            onChange={(event) => onSearch(event.currentTarget.value)}
            data-testid="filter-search"
          />
          <ScrollArea.Autosize mah={PICKER_MAX_HEIGHT} type="auto">
            <Stack gap="sm">
              {picker.groups.map((group) => (
                <Stack key={group.attributeId} gap={4}>
                  <Text size="xs" fw={600} c="dimmed">
                    {group.name}
                  </Text>
                  {group.filters.map((option) => (
                    <Checkbox
                      key={option.filterId}
                      size="sm"
                      label={option.label}
                      checked={picker.selected.has(option.filterId)}
                      onChange={() => onToggle(option.filterId)}
                      data-testid={`filter-${option.filterId}`}
                    />
                  ))}
                </Stack>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
