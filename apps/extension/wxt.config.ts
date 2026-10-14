import { IDEALO_MATCH_PATTERNS } from "@idealo-hw/idealo-query/url/constants";
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "idealo Hardware Rating",
    description: "Benchmark ratings and batch filters for idealo.de hardware listings.",
    permissions: ["storage", "unlimitedStorage", "identity", "scripting"],
    host_permissions: [...IDEALO_MATCH_PATTERNS, "https://openrouter.ai/*"],
  },
});
