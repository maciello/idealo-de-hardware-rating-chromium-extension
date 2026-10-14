import type { FilterId, PriceRange, Requirements } from "@idealo-hw/idealo-query";

/** Everything the panel lets the user do. */
export interface FilterActions {
  open(): void;
  close(): void;
  changeText(text: string): void;
  changePrice(price: PriceRange): void;
  /** Drops the page price once the requirement slider takes over the price. */
  clearPrice(): void;
  changeSort(sort: string): void;
  toggleFilter(filterId: FilterId): void;
  searchFilters(text: string): void;
  changeRequirements(next: Requirements): void;
  reset(): void;
  apply(): void;
  openSettings(): void;
}
