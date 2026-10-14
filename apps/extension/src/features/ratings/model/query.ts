import type { FormFactor } from "@idealo-hw/hw-bench";

export interface RatingQuery {
  title: string;
  text: string;
  priceEur?: number | undefined;
  /** Device class of the page the item sits on; ranks the CPU against laptop or desktop CPUs. */
  formFactor?: FormFactor | undefined;
}
