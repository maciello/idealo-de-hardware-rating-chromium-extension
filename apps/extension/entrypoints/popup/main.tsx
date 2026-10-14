import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installGlobalErrorReporting } from "../../src/diagnostics/error-log";
import { PopupApp } from "../../src/popup/PopupApp";
import { createHwTheme } from "../../src/ui/theme";
import { tokenCss } from "../../src/ui/tokens";

installGlobalErrorReporting("popup");

const tokens = document.createElement("style");
tokens.textContent = `${tokenCss(":root")} body{width:360px;margin:0;background:var(--hw-surface);color:var(--hw-ink);}`;
document.head.append(tokens);

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <MantineProvider
        theme={createHwTheme("Roboto, system-ui, -apple-system, 'Segoe UI', sans-serif")}
        forceColorScheme="light"
      >
        <PopupApp />
      </MantineProvider>
    </StrictMode>,
  );
}
