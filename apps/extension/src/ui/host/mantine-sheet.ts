import mantineCss from "@mantine/core/styles.css?inline";

/** Parsed once; the overlay is a single shadow root, but a constructed sheet keeps it off the DOM. */
export const mantineSheet = ((): CSSStyleSheet | null => {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(mantineCss);
    return sheet;
  } catch {
    return null;
  }
})();
