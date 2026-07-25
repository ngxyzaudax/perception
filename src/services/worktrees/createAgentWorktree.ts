import { mkdir, symlink } from "node:fs/promises";
import { join } from "node:path";
import { getCwd } from "../../utils/cwd.js";
import { findGitRoot } from "./findGitRoot.js";
import { injectWorktreeSandboxPolicy } from "./injectWorktreeSandbox.js";
import { runGit } from "./runGit.js";
import {
  validateWorktreeSlug,
  worktreeBranchName,
  worktreePathFor,
  worktreesDirectory,
} from "./worktreePaths.js";

export type AgentWorktree = {
  worktreePath: string;
  branch: string;
  headCommit: string;
  gitRoot: string;
};

export const createAgentWorktree = async (slug: string): Promise<AgentWorktree> => {
  validateWorktreeSlug(slug);
  const cwd = getCwd();
  const gitRoot = await findGitRoot(cwd);
  if (!gitRoot) {
    throw new Error("not in a git repository");
  }
  const worktreePath = worktreePathFor(gitRoot, slug);
  const branch = worktreeBranchName(slug);
  const existing = await readWorktreeHead(worktreePath);
  if (existing) {
    await injectWorktreeSandboxPolicy(worktreePath);
    return { worktreePath, branch, headCommit: existing, gitRoot };
  }
  await mkdir(worktreesDirectory(gitRoot), { recursive: true });
  const head = await resolveHead(gitRoot);
  const created = await runGit(
    ["worktree", "add", "-B", branch, worktreePath, "HEAD"],
    gitRoot,
  );
  if (created.exitCode !== 0) {
    throw new Error(created.stderr || "failed to create worktree");
  }
  await symlinkNodeModules(gitRoot, worktreePath);
  await injectWorktreeSandboxPolicy(worktreePath);
  return { worktreePath, branch, headCommit: head, gitRoot };
};

const resolveHead = async (gitRoot: string): Promise<string> => {
  const result = await runGit(["rev-parse", "HEAD"], gitRoot);
  if (result.exitCode !== 0) {
    throw new Error("failed to resolve HEAD");
  }
  return result.stdout;
};

const readWorktreeHead = async (worktreePath: string): Promise<string | null> => {
  const result = await runGit(["rev-parse", "HEAD"], worktreePath, 5000);
  return result.exitCode === 0 && result.stdout.length > 0 ? result.stdout : null;
};

const symlinkNodeModules = async (gitRoot: string, worktreePath: string): Promise<void> => {
  const source = join(gitRoot, "node_modules");
  const target = join(worktreePath, "node_modules");
  try {
    await symlink(source, target, "dir");
  } catch {
    return;
  }
};
