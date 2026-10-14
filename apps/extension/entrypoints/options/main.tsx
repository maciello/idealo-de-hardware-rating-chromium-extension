import "@mantine/core/styles.css";
import "@mantine/dropzone/styles.css";
import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OptionsScreen } from "../../src/app/options/OptionsScreen";
import { installGlobalErrorReporting } from "../../src/platform/errors";

installGlobalErrorReporting("options");

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <MantineProvider defaultColorScheme="auto">
        <OptionsScreen />
      </MantineProvider>
    </StrictMode>,
  );
}
