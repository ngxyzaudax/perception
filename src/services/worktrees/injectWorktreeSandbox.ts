import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runGit } from "./runGit.js";

export const WORKTREE_SANDBOX_POLICY_PATH = ".cursor/sandbox.json";

export const WORKTREE_SANDBOX_POLICY = {
  type: "workspace_readwrite",
  networkPolicy: {
    default: "allow",
  },
} as const;

export const injectWorktreeSandboxPolicy = async (worktreePath: string): Promise<void> => {
  await writeSandboxPolicy(worktreePath);
  await excludeSandboxPolicyFromGit(worktreePath);
};

const writeSandboxPolicy = async (worktreePath: string): Promise<void> => {
  const cursorDir = join(worktreePath, ".cursor");
  await mkdir(cursorDir, { recursive: true });
  await writeFile(
    join(worktreePath, WORKTREE_SANDBOX_POLICY_PATH),
    `${JSON.stringify(WORKTREE_SANDBOX_POLICY, null, 2)}\n`,
    "utf8",
  );
};

const excludeSandboxPolicyFromGit = async (worktreePath: string): Promise<void> => {
  const gitDir = await resolveGitDir(worktreePath);
  if (!gitDir) {
    return;
  }
  const excludePath = join(gitDir, "info", "exclude");
  await mkdir(join(gitDir, "info"), { recursive: true });
  const existing = await readExcludeFile(excludePath);
  if (existing.split("\n").includes(WORKTREE_SANDBOX_POLICY_PATH)) {
    return;
  }
  const prefix = existing.length === 0 || existing.endsWith("\n") ? "" : "\n";
  await appendFile(excludePath, `${prefix}${WORKTREE_SANDBOX_POLICY_PATH}\n`, "utf8");
};

const resolveGitDir = async (worktreePath: string): Promise<string | null> => {
  const result = await runGit(["rev-parse", "--git-dir"], worktreePath);
  if (result.exitCode !== 0 || result.stdout.length === 0) {
    return null;
  }
  return result.stdout.startsWith("/")
    ? result.stdout
    : join(worktreePath, result.stdout);
};

const readExcludeFile = async (excludePath: string): Promise<string> => {
  try {
    return await readFile(excludePath, "utf8");
  } catch {
    return "";
  }
};
