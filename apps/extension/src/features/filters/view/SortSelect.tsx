import { Select } from "@mantine/core";
import { FILTERS_COPY } from "../copy";
import type { FilterViewModel } from "../view-model";

export interface SortSelectProps {
  sort: FilterViewModel["sort"];
  onChange: (sort: string) => void;
}

export function SortSelect({ sort, onChange }: SortSelectProps) {
  return (
    <Select
      label={FILTERS_COPY.sortLabel}
      data={[...sort.options]}
      value={sort.value}
      allowDeselect={false}
      comboboxProps={{ withinPortal: false }}
      onChange={(value) => onChange(value ?? "")}
      data-testid="sort-select"
    />
  );
}
