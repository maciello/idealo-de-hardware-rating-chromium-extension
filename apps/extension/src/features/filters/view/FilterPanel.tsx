import { Accordion, Alert, Drawer, Stack, TextInput, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { ICON_SIZE } from "../../../ui";
import { RequirementsSection } from "../../requirements";
import { DRAWER_SIZE } from "../config";
import { FILTERS_COPY } from "../copy";
import type { FilterActions, FilterViewModel } from "../view-model";
import { FilterFab } from "./FilterFab";
import { FilterPicker } from "./FilterPicker";
import { PanelFooter } from "./PanelFooter";
import { PriceRange } from "./PriceRange";
import { SelectionDetails } from "./SelectionDetails";
import { SortSelect } from "./SortSelect";

export interface FilterPanelProps {
  opened: boolean;
  model: FilterViewModel;
  actions: FilterActions;
}

/** Floating button plus the drawer that builds an idealo query from text, price, sort and filters. */
export function FilterPanel({ opened, model, actions }: FilterPanelProps) {
  const { note, requirements, priceInputs } = model;
  return (
    <>
      <FilterFab onOpen={actions.open} />

      <Drawer
        opened={opened}
        onClose={actions.close}
        position="right"
        size={DRAWER_SIZE}
        title={<Title order={4}>{FILTERS_COPY.title}</Title>}
        data-testid="filter-drawer"
      >
        <Stack gap="md">
          <TextInput
            label={FILTERS_COPY.textLabel}
            placeholder={FILTERS_COPY.textPlaceholder}
            value={model.text}
            onChange={(event) => actions.changeText(event.currentTarget.value)}
            data-testid="query-text"
          />

          {note !== null && (
            <Alert
              variant="light"
              color="gray"
              icon={<IconInfoCircle size={ICON_SIZE.s} />}
              data-testid={note.testId}
            >
              {note.text}
            </Alert>
          )}

          {requirements !== null && (
            <RequirementsSection
              {...requirements}
              onChange={actions.changeRequirements}
              onPriceChange={actions.clearPrice}
              onOpenSettings={actions.openSettings}
            />
          )}

          {priceInputs !== null && (
            <PriceRange price={priceInputs.price} onChange={actions.changePrice} />
          )}

          <SortSelect sort={model.sort} onChange={actions.changeSort} />

          <Accordion variant="contained" chevronPosition="left" multiple>
            {model.picker.available && (
              <FilterPicker
                picker={model.picker}
                onSearch={actions.searchFilters}
                onToggle={actions.toggleFilter}
              />
            )}
            <SelectionDetails summary={model.summary} url={model.url} />
          </Accordion>

          <PanelFooter model={model} actions={actions} />
        </Stack>
      </Drawer>
    </>
  );
}
