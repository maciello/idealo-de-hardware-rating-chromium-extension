import { HOST_TAG_PREFIX } from "../../../ui/theme";

/** The chip is absolutely positioned in its tile; a static tile becomes the containing block. */
export function anchorPosition(element: Element): () => void {
  if (!(element instanceof HTMLElement) || getComputedStyle(element).position !== "static") {
    return () => undefined;
  }
  const previous = element.style.position;
  element.style.position = "relative";
  return () => {
    element.style.position = previous;
  };
}

/** True when a mutation only added or removed our own hosts: rating again would loop forever. */
export const isOwnMutation = (mutation: MutationRecord): boolean =>
  [...mutation.addedNodes, ...mutation.removedNodes].every(
    (node) => node instanceof Element && node.localName.startsWith(HOST_TAG_PREFIX),
  );
