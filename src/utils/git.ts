import { runShell } from "./shell.js";

export const getGitStatus = async (cwd?: string): Promise<string | null> => {
  const result = await runShell("git status --short 2>/dev/null | head -20", 5000, undefined, cwd);
  if (result.exitCode !== 0 || result.stdout.trim().length === 0) {
    return null;
  }
  return result.stdout.trim();
};
