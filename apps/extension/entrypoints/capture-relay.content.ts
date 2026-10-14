import { TapMessageSchema } from "../src/capture/protocol";
import { captureRing } from "../src/capture/ring";
import { captureModeItem } from "../src/platform/storage";

export default defineContentScript({
  matches: ["https://www.idealo.de/*"],
  runAt: "document_start",
  main(ctx) {
    let enabled: boolean | undefined;
    const early: unknown[] = [];

    const accept = (data: unknown): void => {
      const message = TapMessageSchema.safeParse(data);
      if (message.success) void captureRing.append(message.data.response);
    };

    const flush = (): void => {
      for (const data of early.splice(0)) if (enabled) accept(data);
    };

    ctx.addEventListener(window, "message", (event) => {
      if (event.source !== window || event.origin !== location.origin) return;
      if (enabled === undefined) early.push(event.data);
      else if (enabled) accept(event.data);
    });

    void captureModeItem.getValue().then((value) => {
      enabled ??= value;
      flush();
    });
    const unwatch = captureModeItem.watch((value) => {
      enabled = value;
      flush();
    });
    ctx.onInvalidated(unwatch);
  },
});
