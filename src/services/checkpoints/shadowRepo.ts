import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { cwdSlug, perceptionHome } from "../sessions/sessionPaths.js";
import { getCwd } from "../../utils/cwd.js";
import { runShell } from "../../utils/shell.js";

export type CheckpointEntry = {
  sha: string;
  label: string;
  timestamp: string;
};

export type ShadowRepoStatus = {
  enabled: boolean;
  reason?: string;
};

const shadowRepoPath = (cwd: string = getCwd()): string =>
  join(perceptionHome(), "checkpoints", cwdSlug(cwd));

const gitEnv = (cwd: string = getCwd()): string => {
  const gitDir = shadowRepoPath(cwd);
  const workTree = cwd;
  return `GIT_DIR=${shellQuote(gitDir)} GIT_WORK_TREE=${shellQuote(workTree)}`;
};

export const getShadowRepoStatus = async (cwd: string = getCwd()): Promise<ShadowRepoStatus> => {
  const gitCheck = await runShell("command -v git >/dev/null && echo ok", 5000);
  if (gitCheck.exitCode !== 0) {
    return { enabled: false, reason: "git not available" };
  }
  return { enabled: true };
};

export const ensureShadowRepo = async (cwd: string = getCwd()): Promise<ShadowRepoStatus> => {
  const status = await getShadowRepoStatus(cwd);
  if (!status.enabled) {
    return status;
  }
  await mkdir(shadowRepoPath(cwd), { recursive: true });
  const init = await runGit("rev-parse --git-dir", cwd);
  if (init.exitCode !== 0) {
    const created = await runGit("init", cwd);
    if (created.exitCode !== 0) {
      return { enabled: false, reason: created.stderr.trim() || "shadow repo init failed" };
    }
    await runGit("config core.excludesfile .gitignore", cwd);
  }
  return { enabled: true };
};

export const createCheckpoint = async (
  label: string,
  cwd: string = getCwd(),
): Promise<CheckpointEntry | null> => {
  const status = await ensureShadowRepo(cwd);
  if (!status.enabled) {
    return null;
  }
  await runGit("add -A", cwd);
  const commit = await runGit(`commit -m ${shellQuote(label)} --allow-empty`, cwd);
  if (commit.exitCode !== 0 && !commit.stdout.includes("nothing to commit")) {
    return null;
  }
  const shaResult = await runGit("rev-parse HEAD", cwd);
  if (shaResult.exitCode !== 0) {
    return null;
  }
  const sha = shaResult.stdout.trim();
  const log = await runGit(`log -1 --format=%cI ${sha}`, cwd);
  return {
    sha,
    label,
    timestamp: log.stdout.trim() || new Date().toISOString(),
  };
};

export const restoreCheckpoint = async (sha: string, cwd: string = getCwd()): Promise<boolean> => {
  const status = await ensureShadowRepo(cwd);
  if (!status.enabled) {
    return false;
  }
  const checkout = await runGit(`checkout ${sha} -- .`, cwd);
  if (checkout.exitCode !== 0) {
    return false;
  }
  const clean = await runGit("clean -fd", cwd);
  return clean.exitCode === 0;
};

export const listCheckpoints = async (cwd: string = getCwd()): Promise<CheckpointEntry[]> => {
  const status = await ensureShadowRepo(cwd);
  if (!status.enabled) {
    return [];
  }
  const log = await runGit("log --format=%H%x09%s%x09%cI -n 20", cwd);
  if (log.exitCode !== 0 || log.stdout.trim().length === 0) {
    return [];
  }
  return log.stdout
    .trim()
    .split("\n")
    .map((line) => {
      const [sha, label, timestamp] = line.split("\t");
      return { sha: sha ?? "", label: label ?? "", timestamp: timestamp ?? "" };
    })
    .filter((entry) => entry.sha.length > 0);
};

const runGit = async (args: string, cwd: string = getCwd()) =>
  runShell(`${gitEnv(cwd)} git ${args}`, 30000);

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;
