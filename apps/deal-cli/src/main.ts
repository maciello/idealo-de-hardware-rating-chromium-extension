import { parseCommand } from "./args";
import { runRank } from "./run";
import { inputSchemas } from "./schema";

function main(argv: readonly string[]): void {
  const command = parseCommand(argv);
  if (command.name === "schema") {
    console.log(JSON.stringify(inputSchemas(), null, 2));
    return;
  }
  const result = runRank(command.options);
  for (const warning of result.warnings) console.error(`warning: ${warning}`);
  const { summary } = result.report;
  console.log(
    `${summary.candidates} candidates, ${summary.eligible} eligible, ${summary.excluded} excluded`,
  );
  console.log(`wrote ${result.jsonPath}`);
  console.log(`wrote ${result.markdownPath}`);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
