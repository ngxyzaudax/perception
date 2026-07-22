import { isAbsolute, join, resolve } from "node:path";
import { getCwd } from "./cwd.js";

export const expandPath = (input: string, cwd: string = getCwd()): string =>
  isAbsolute(input) ? resolve(input) : resolve(cwd, input);

export const toRelativePath = (absolutePath: string, cwd: string = getCwd()): string => {
  const relative = join(cwd, ".", absolutePath.replace(cwd, ""));
  return relative.startsWith(cwd) ? relative.slice(cwd.length + 1) : absolutePath;
};
