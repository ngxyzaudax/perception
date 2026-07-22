import { runShell } from "../../utils/shell.js";

export type GitResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export const runGit = async (
  args: string[],
  cwd: string,
  timeoutMs: number = 30000,
): Promise<GitResult> => {
  const command = `git ${args.map(shellQuote).join(" ")}`;
  const result = await runShell(command, timeoutMs, undefined, cwd);
  return {
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    exitCode: result.exitCode,
  };
};

const shellQuote = (value: string): string =>
  `'${value.replace(/'/g, `'\\''`)}'`;
