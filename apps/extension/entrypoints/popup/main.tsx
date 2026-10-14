import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PopupScreen } from "../../src/app/popup/PopupScreen";
import { installGlobalErrorReporting } from "../../src/platform/errors";
import { createHwTheme, PAGE_FONT_FAMILY, popupPageStyles } from "../../src/ui";

installGlobalErrorReporting("popup");

const pageStyles = document.createElement("style");
pageStyles.textContent = popupPageStyles();
document.head.append(pageStyles);

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <MantineProvider theme={createHwTheme(PAGE_FONT_FAMILY)} forceColorScheme="light">
        <PopupScreen />
      </MantineProvider>
    </StrictMode>,
  );
}
