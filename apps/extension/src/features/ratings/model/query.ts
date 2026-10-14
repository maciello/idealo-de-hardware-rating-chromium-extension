import type { FormFactor } from "@idealo-hw/hw-bench";

export interface RatingQuery {
  title: string;
  text: string;
  priceEur?: number | undefined;
  /** Device class of the page the item sits on; ranks the CPU against laptop or desktop CPUs. */
  formFactor?: FormFactor | undefined;
  /** A listing tile's spec values as the payload lists them; absent for tiles read from the markup. */
  characteristics?: readonly string[] | undefined;
  /** A product page's datasheet ("Label<TAB>Value" lines); absent on listings. */
  datasheet?: string | undefined;
}
