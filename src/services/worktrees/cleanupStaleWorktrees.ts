import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { getCwd } from "../../utils/cwd.js";
import { findGitRoot } from "./findGitRoot.js";
import { removeAgentWorktree } from "./removeAgentWorktree.js";
import { runGit } from "./runGit.js";
import {
  AGENT_WORKTREE_PATTERN,
  worktreeBranchName,
  worktreesDirectory,
} from "./worktreePaths.js";

const STALE_DAYS = 7;

export const cleanupStaleWorktrees = async (): Promise<number> => {
  const gitRoot = await findGitRoot(getCwd());
  if (!gitRoot) {
    return 0;
  }
  const directory = worktreesDirectory(gitRoot);
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch {
    return 0;
  }
  const cutoffMs = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const slug of entries) {
    if (!AGENT_WORKTREE_PATTERN.test(slug)) {
      continue;
    }
    const worktreePath = join(directory, slug);
    let mtimeMs = 0;
    try {
      mtimeMs = (await stat(worktreePath)).mtimeMs;
    } catch {
      continue;
    }
    if (mtimeMs >= cutoffMs) {
      continue;
    }
    if (!(await isSafeToRemove(worktreePath))) {
      continue;
    }
    const branch = worktreeBranchName(slug);
    if (await removeAgentWorktree({ worktreePath, branch, gitRoot })) {
      removed += 1;
    }
  }
  if (removed > 0) {
    await runGit(["worktree", "prune"], gitRoot);
  }
  return removed;
};

const isSafeToRemove = async (worktreePath: string): Promise<boolean> => {
  const status = await runGit(["status", "--porcelain", "-uno"], worktreePath);
  if (status.exitCode !== 0 || status.stdout.length > 0) {
    return false;
  }
  const unpushed = await runGit(
    ["rev-list", "--max-count=1", "HEAD", "--not", "--remotes"],
    worktreePath,
  );
  return unpushed.exitCode === 0 && unpushed.stdout.length === 0;
};
