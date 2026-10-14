import { onMessage } from "../src/messaging";

export default defineBackground(() => {
  onMessage("openOptions", () => browser.runtime.openOptionsPage());
});
