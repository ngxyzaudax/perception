import { removeAgentWorktree } from "./removeAgentWorktree.js";
import { runGit } from "./runGit.js";

export type WorktreeFinalizeResult = {
  hasChanges: boolean;
  branch: string;
  diffstat: string;
  worktreePath: string;
  removed: boolean;
};

export const finalizeAgentWorktree = async (input: {
  worktreePath: string;
  branch: string;
  gitRoot: string;
  headCommit: string;
  agentId: string;
  description: string;
  removeWhenClean?: boolean;
}): Promise<WorktreeFinalizeResult> => {
  const dirty = await isDirty(input.worktreePath);
  if (dirty) {
    await commitWorktree(input);
  }
  const diffstat = await readDiffstat(input.worktreePath, input.headCommit);
  const hasChanges = await hasCommitsSince(input.worktreePath, input.headCommit);
  const shouldRemove = (input.removeWhenClean ?? true) && !hasChanges;
  let removed = false;
  if (shouldRemove) {
    removed = await removeAgentWorktree({
      worktreePath: input.worktreePath,
      branch: input.branch,
      gitRoot: input.gitRoot,
    });
  }
  return {
    hasChanges,
    branch: input.branch,
    diffstat,
    worktreePath: input.worktreePath,
    removed,
  };
};

const isDirty = async (worktreePath: string): Promise<boolean> => {
  const status = await runGit(["status", "--porcelain"], worktreePath);
  if (status.exitCode !== 0) {
    return false;
  }
  return status.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.includes("node_modules"))
    .length > 0;
};

const commitWorktree = async (input: {
  worktreePath: string;
  agentId: string;
  description: string;
}): Promise<void> => {
  await runGit(["add", "-A", "--", ".", ":!node_modules"], input.worktreePath);
  const message = `agent ${input.agentId}: ${input.description}`;
  await runGit(["commit", "-m", message], input.worktreePath);
};

const readDiffstat = async (worktreePath: string, headCommit: string): Promise<string> => {
  const diff = await runGit(["diff", "--stat", `${headCommit}..HEAD`], worktreePath);
  if (diff.exitCode !== 0) {
    return "";
  }
  return diff.stdout;
};

const hasCommitsSince = async (worktreePath: string, headCommit: string): Promise<boolean> => {
  const revList = await runGit(["rev-list", "--count", `${headCommit}..HEAD`], worktreePath);
  if (revList.exitCode !== 0) {
    return true;
  }
  return parseInt(revList.stdout, 10) > 0;
};
