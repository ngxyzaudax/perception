import {
  resolveIsolation,
  tryCreateWorktree,
  type AgentIsolation,
} from "../agents/agentNotify.js";
import { finalizeAgentWorktree } from "../worktrees/finalizeAgentWorktree.js";
import {
  updateCursorAgentTask,
  type CursorAgentRuntime,
  type CursorAgentTask,
} from "../../state/cursorAgentTasks.js";
import { getCwd } from "../../utils/cwd.js";

export type CursorWorktreeResult = Awaited<ReturnType<typeof finalizeAgentWorktree>>;

export type CursorWorktreePrep = {
  cwd: string;
  branch?: string;
  gitRoot?: string;
  headCommit?: string;
  isolated: boolean;
};

const sharedTree = (cwd: string): CursorWorktreePrep => ({ cwd, isolated: false });

const isolatedTree = (
  worktree: NonNullable<Awaited<ReturnType<typeof tryCreateWorktree>>>,
): CursorWorktreePrep => ({
  cwd: worktree.worktreePath,
  branch: worktree.branch,
  gitRoot: worktree.gitRoot,
  headCommit: worktree.headCommit,
  isolated: true,
});

export const prepareCursorWorktree = async (input: {
  taskId: string;
  runtime: CursorAgentRuntime;
  isolation: AgentIsolation | undefined;
  runInBackground: boolean;
  fallbackCwd: string;
}): Promise<CursorWorktreePrep> => {
  if (input.runtime !== "local") {
    return sharedTree(input.fallbackCwd);
  }
  if (resolveIsolation(input.runInBackground, input.isolation) !== "worktree") {
    return sharedTree(input.fallbackCwd);
  }
  const worktree = await tryCreateWorktree(input.taskId);
  return worktree ? isolatedTree(worktree) : sharedTree(input.fallbackCwd);
};

export const reuseCursorWorktree = (task: CursorAgentTask): CursorWorktreePrep =>
  task.isolated && task.cwd
    ? {
        cwd: task.cwd,
        branch: task.worktreeBranch,
        gitRoot: task.worktreeGitRoot,
        headCommit: task.worktreeHeadCommit,
        isolated: true,
      }
    : sharedTree(task.cwd ?? getCwd());

export const finalizeCursorWorktree = async (
  task: CursorAgentTask,
): Promise<CursorWorktreeResult | null> => {
  if (
    !task.isolated ||
    !task.cwd ||
    !task.worktreeBranch ||
    !task.worktreeGitRoot ||
    !task.worktreeHeadCommit
  ) {
    return null;
  }
  const result = await finalizeAgentWorktree({
    worktreePath: task.cwd,
    branch: task.worktreeBranch,
    gitRoot: task.worktreeGitRoot,
    headCommit: task.worktreeHeadCommit,
    agentId: task.id,
    description: task.description,
    removeWhenClean: true,
  });
  if (result.removed) {
    updateCursorAgentTask(task.id, { isolated: false, cwd: task.worktreeGitRoot });
  }
  return result;
};
