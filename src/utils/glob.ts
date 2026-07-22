import fg from "fast-glob";
import { expandPath } from "./path.js";

export type GlobOptions = {
  pattern: string;
  cwd?: string;
  limit?: number;
  baseCwd?: string;
};

export const findFiles = async (options: GlobOptions): Promise<string[]> => {
  const base = options.baseCwd ?? process.cwd();
  const cwd = expandPath(options.cwd ?? ".", base);
  const limit = options.limit ?? 100;
  const matches = await fg(options.pattern, {
    cwd,
    absolute: false,
    dot: false,
    onlyFiles: true,
    suppressErrors: true,
  });
  return matches.slice(0, limit);
};
