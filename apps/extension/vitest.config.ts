import { defineProject } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineProject({
  plugins: [WxtVitest({ root: import.meta.dirname })],
  test: {
    name: "extension",
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
