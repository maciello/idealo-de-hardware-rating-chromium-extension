import { type Requirements, RequirementsSchema } from "@idealo-hw/idealo-query";
import { storage } from "@wxt-dev/storage";
import { z } from "zod";
import { emptyRequirements, isEmpty } from "../model";

const StoredSchema = z.record(z.string(), z.unknown());

/** Last requirements per idealo category id, so the user does not start over on every visit. */
const requirementsItem = storage.defineItem<Record<string, unknown>>("local:requirements", {
  fallback: {},
  version: 1,
});

async function readAll(): Promise<Record<string, unknown>> {
  const parsed = StoredSchema.safeParse(await requirementsItem.getValue());
  return parsed.success ? parsed.data : {};
}

/** Storage is a trust boundary: an unreadable entry is treated as never saved. */
export async function loadRequirements(categoryId: string): Promise<Requirements> {
  const parsed = RequirementsSchema.safeParse((await readAll())[categoryId]);
  return parsed.success ? parsed.data : emptyRequirements();
}

/** Saving empty requirements forgets the category. */
export async function saveRequirements(
  categoryId: string,
  requirements: Requirements,
): Promise<void> {
  const { [categoryId]: _previous, ...others } = await readAll();
  await requirementsItem.setValue(
    isEmpty(requirements) ? others : { ...others, [categoryId]: requirements },
  );
}
