/** What a product states about itself; every field is optional, absent means not stated. */
export interface ProductFacts {
  /** CPU thermal design power in watts, as a product datasheet states it. */
  cpuTdpWatts?: number;
}
