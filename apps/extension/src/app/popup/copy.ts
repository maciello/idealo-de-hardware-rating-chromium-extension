export const POPUP_COPY = {
  title: "idealo Hardware Rating",
  thisPage: "This page",
  openIdealoPage: "Open an idealo listing or product page",
  readingPage: "Reading this page",
  productRated: "This product has a CPU rating",
  productUnrated: "No CPU rating for this product",
  noProducts: "No products found on this page",
  listingRated: (rated: number, total: number) => `${rated} of ${total} products rated`,
  openFilterBuilder: "Open filter builder",
  settings: "Settings",
} as const;
