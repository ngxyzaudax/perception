import { runShell } from "../utils/shell.js";

export const loadGitDiff = async (): Promise<string> => {
  const result = await runShell("git diff --no-color", 30000);
  if (result.exitCode !== 0 && result.stdout.trim().length === 0) {
    return result.stderr.trim() || "git diff failed";
  }
  return result.stdout.trim() || "no uncommitted changes";
};
