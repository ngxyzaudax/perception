#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const requireFromPackage = createRequire(join(packageRoot, "package.json"));
const tsxCli = requireFromPackage.resolve("tsx/cli");
const tsconfigPath = join(packageRoot, "tsconfig.json");
const mainPath = join(packageRoot, "src/main.ts");

const result = spawnSync(
  process.execPath,
  [tsxCli, "--tsconfig", tsconfigPath, mainPath, ...process.argv.slice(2)],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
