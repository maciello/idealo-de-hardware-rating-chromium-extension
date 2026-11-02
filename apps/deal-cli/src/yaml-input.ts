import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { z } from "zod";

const describeIssues = (error: z.ZodError): string =>
  error.issues.map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`).join("\n");

/** Reads a YAML file and parses it through a zod schema; throws one readable error naming the file. */
export function readYamlFile<S extends z.ZodType>(path: string, schema: S): z.output<S> {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    throw new Error(
      `cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let data: z.input<S>;
  try {
    data = parse(text);
  } catch (error) {
    throw new Error(
      `${path} is not valid YAML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const result = schema.safeParse(data);
  if (!result.success)
    throw new Error(`${path} does not match the schema:\n${describeIssues(result.error)}`);
  return result.data;
}
