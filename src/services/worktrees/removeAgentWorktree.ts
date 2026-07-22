import { runGit } from "./runGit.js";

export const removeAgentWorktree = async (input: {
  worktreePath: string;
  branch?: string;
  gitRoot: string;
}): Promise<boolean> => {
  const removed = await runGit(
    ["worktree", "remove", "--force", input.worktreePath],
    input.gitRoot,
  );
  if (removed.exitCode !== 0) {
    return false;
  }
  if (!input.branch) {
    return true;
  }
  const deleted = await runGit(["branch", "-D", input.branch], input.gitRoot);
  return deleted.exitCode === 0;
};
