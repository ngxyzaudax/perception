import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type PackageJson = {
  version: string;
};

const require = createRequire(import.meta.url);
const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), "../../package.json");

export const getPackageVersion = (): string =>
  (require(packageJsonPath) as PackageJson).version;
