import { homedir } from "node:os";
import { relative, resolve, sep } from "node:path";

export type PathSafetyResult =
  | { ok: true; sensitive: boolean }
  | { ok: false; reason: string };

export const checkPathSafety = (
  absolutePath: string,
  cwd: string,
  additionalDirectories: string[] = [],
): PathSafetyResult => {
  const resolved = resolve(absolutePath);
  const allowedRoots = [resolve(cwd), ...additionalDirectories.map((dir) => resolve(dir))];
  if (!allowedRoots.some((root) => isInsideRoot(resolved, root))) {
    return {
      ok: false,
      reason: `Path is outside the working directory: ${resolved}`,
    };
  }
  return { ok: true, sensitive: isSensitivePath(resolved) };
};

export const isInsideRoot = (absolutePath: string, root: string): boolean => {
  const rel = relative(root, absolutePath);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !rel.startsWith(".."));
};

const PERCEPTION_DIR = `${sep}.perception`;
const PERCEPTION_WORKTREES = `${PERCEPTION_DIR}${sep}worktrees`;

const SENSITIVE_SUFFIXES = [
  `${sep}.git`,
  PERCEPTION_DIR,
  `${sep}.ssh`,
  `${sep}.gnupg`,
];

const SENSITIVE_BASENAMES = new Set([
  ".bashrc",
  ".zshrc",
  ".profile",
  ".bash_profile",
  ".zprofile",
  ".gitconfig",
  "id_rsa",
  "id_ed25519",
  "authorized_keys",
]);

export const isPerceptionWorktreePath = (absolutePath: string): boolean => {
  const resolved = resolve(absolutePath);
  return (
    resolved.includes(`${PERCEPTION_WORKTREES}${sep}`) || resolved.endsWith(PERCEPTION_WORKTREES)
  );
};

export const isSensitivePath = (absolutePath: string): boolean => {
  const resolved = resolve(absolutePath);
  const inWorktree = isPerceptionWorktreePath(resolved);
  const homePerception = resolve(homedir(), ".perception");
  if (!inWorktree && isInsideRoot(resolved, homePerception)) {
    return true;
  }
  if (
    SENSITIVE_SUFFIXES.some((suffix) => {
      if (suffix === PERCEPTION_DIR && inWorktree) {
        return false;
      }
      return resolved.includes(`${suffix}${sep}`) || resolved.endsWith(suffix);
    })
  ) {
    return true;
  }
  const base = resolved.split(sep).pop() ?? "";
  return SENSITIVE_BASENAMES.has(base);
};
