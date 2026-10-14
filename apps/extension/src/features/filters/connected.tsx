import { type FilterBuilderInput, useFilterBuilder } from "./controller";
import { FilterPanel } from "./view/FilterPanel";

/** The filter builder wired to its state: the panel over `useFilterBuilder`. */
export function FilterBuilder(props: FilterBuilderInput) {
  const { model, actions } = useFilterBuilder(props);
  return <FilterPanel opened={props.opened} model={model} actions={actions} />;
}
