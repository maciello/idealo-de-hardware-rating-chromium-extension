import { z } from "zod";
import { HEART, ID_KEYS, OFFERS_LINK, PRODUCT_ID_IN_HREF } from "./selectors";

const idString = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(z.string().regex(/^\d+$/));

function idFromHeart(raw: string | null): string | undefined {
  if (raw === null) return undefined;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const record = z.record(z.string(), z.unknown()).safeParse(json);
  if (!record.success) return undefined;
  for (const key of ID_KEYS) {
    const id = idString.safeParse(record.data[key]);
    if (id.success) return id.data;
  }
  return undefined;
}

const idFromHref = (href: string | null): string | undefined =>
  PRODUCT_ID_IN_HREF.exec(href ?? "")?.[1];

export interface Seed {
  element: Element;
  id: string;
}

export function findSeeds(root: ParentNode): Seed[] {
  const seeds: Seed[] = [];
  for (const element of root.querySelectorAll(`${HEART}, ${OFFERS_LINK}`)) {
    const id = element.matches(HEART)
      ? (idFromHeart(element.getAttribute("data-wishlist-heart")) ??
        idFromHref(element.getAttribute("href")))
      : idFromHref(element.getAttribute("href"));
    if (id !== undefined) seeds.push({ element, id });
  }
  return seeds;
}
