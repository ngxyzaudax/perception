import { runShell } from "../utils/shell.js";
import { getCwd } from "../utils/cwd.js";

export const buildCommitPrompt = async (): Promise<string> => {
  const status = await runShell("git status --short", 10000, undefined, getCwd());
  const diff = await runShell("git diff HEAD", 30000, undefined, getCwd());
  return [
    "Create a git commit for the current changes.",
    "Stage the relevant files, write a concise commit message, and run git commit.",
    "Do not push.",
    "",
    "Git status:",
    status.stdout.trim() || "clean",
    "",
    "Diff against HEAD:",
    diff.stdout.trim() || "no changes",
  ].join("\n");
};

export const buildReviewPrompt = async (): Promise<string> => {
  const diff = await runShell("git diff HEAD", 30000, undefined, getCwd());
  return [
    "Review the current code changes.",
    "Report bugs, regressions, missing tests, and style issues.",
    "Use this structure: findings (ordered by severity), open questions, brief summary.",
    "",
    "Diff against HEAD:",
    diff.stdout.trim() || "no changes",
  ].join("\n");
};
