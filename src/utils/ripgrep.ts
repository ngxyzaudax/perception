import { execa } from "execa";
import { expandPath } from "./path.js";

export type GrepOptions = {
  pattern: string;
  path?: string;
  glob?: string;
  outputMode?: "content" | "files_with_matches" | "count";
  headLimit?: number;
  caseInsensitive?: boolean;
  cwd?: string;
};

export const searchContent = async (options: GrepOptions): Promise<string> => {
  const base = options.cwd ?? process.cwd();
  const target = expandPath(options.path ?? ".", base);
  const args = buildRipgrepArgs(options, target);
  const result = await execa("rg", args, { reject: false, cwd: base });
  if (result.exitCode === 1 && result.stdout.trim() === "") {
    return "";
  }
  if ((result.exitCode ?? 1) > 1) {
    return result.stderr || result.stdout || "grep failed";
  }
  const lines = result.stdout.trim().split("\n").filter(Boolean);
  const limit = options.headLimit ?? 250;
  if (limit > 0) {
    return lines.slice(0, limit).join("\n");
  }
  return lines.join("\n");
};

const buildRipgrepArgs = (options: GrepOptions, target: string): string[] => {
  const args: string[] = ["--no-heading"];
  if (options.caseInsensitive) {
    args.push("-i");
  }
  if (options.glob) {
    args.push("--glob", options.glob);
  }
  const mode = options.outputMode ?? "files_with_matches";
  if (mode === "count") {
    args.push("--count");
  } else if (mode === "files_with_matches") {
    args.push("-l");
  }
  args.push("--", options.pattern, target);
  return args;
};
