import { FilterCatalogSchema } from "@idealo-hw/idealo-query";
import { storage } from "@wxt-dev/storage";
import { z } from "zod";
import type { VocabularyStore } from "./remembering-catalog";

const StoredSchema = z.record(z.string(), z.unknown());

/** Filter options seen per idealo category id (labels and F-ids only, from the user's own pages). */
const vocabularyItem = storage.defineItem<Record<string, unknown>>("local:filterVocabulary", {
  fallback: {},
  version: 1,
});

async function readAll(): Promise<Record<string, unknown>> {
  const parsed = StoredSchema.safeParse(await vocabularyItem.getValue());
  return parsed.success ? parsed.data : {};
}

/** Storage is a trust boundary: an unreadable entry is treated as never seen. */
export const vocabularyStorage: VocabularyStore = {
  async load(categoryId) {
    const parsed = FilterCatalogSchema.safeParse((await readAll())[categoryId]);
    return parsed.success ? parsed.data : null;
  },
  async save(vocabulary) {
    await vocabularyItem.setValue({ ...(await readAll()), [vocabulary.categoryId]: vocabulary });
  },
};
