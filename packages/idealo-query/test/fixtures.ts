import { categoryId, type FilterCatalog, parseMcpSearchResponseCatalog } from "../src/index";

export const MCP_RESPONSE = {
  products: [],
  availableFilters: [
    {
      attributeId: "5011",
      name: "Prozessor",
      filters: [
        { filterId: "1147301", content: "Intel Core i7", amount: 120 },
        { filterId: "1263422", content: "AMD Ryzen 7", amount: 80 },
      ],
    },
    {
      attributeId: 6022,
      name: "Arbeitsspeicher",
      filters: [
        { filterId: 101483660, content: "16 GB", amount: 200 },
        { filterId: "1309393", content: "32 GB" },
      ],
    },
  ],
  availableManufacturers: [
    { manufacturerId: "77", manufacturerName: "Lenovo", amount: 40, searchFilterId: "5550077" },
    { manufacturerId: "88", manufacturerName: "ASUS", amount: 31 },
  ],
};

export const CATEGORY = categoryId("16073");

export const catalog: FilterCatalog = parseMcpSearchResponseCatalog(MCP_RESPONSE, CATEGORY);
