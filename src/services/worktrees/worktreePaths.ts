import { join } from "node:path";

const VALID_SLUG_SEGMENT = /^[a-zA-Z0-9._-]+$/;
const MAX_SLUG_LENGTH = 64;

export const validateWorktreeSlug = (slug: string): void => {
  if (slug.length > MAX_SLUG_LENGTH) {
    throw new Error(`worktree slug exceeds ${MAX_SLUG_LENGTH} characters`);
  }
  for (const segment of slug.split("/")) {
    if (segment === "." || segment === ".." || !VALID_SLUG_SEGMENT.test(segment)) {
      throw new Error(`invalid worktree slug segment: ${segment}`);
    }
  }
};

export const flattenSlug = (slug: string): string => slug.replaceAll("/", "+");

export const worktreeBranchName = (slug: string): string => `agent/${flattenSlug(slug)}`;

export const worktreesDirectory = (gitRoot: string): string =>
  join(gitRoot, ".perception", "worktrees");

export const worktreePathFor = (gitRoot: string, slug: string): string =>
  join(worktreesDirectory(gitRoot), flattenSlug(slug));

export const AGENT_WORKTREE_PATTERN = /^agent-[a-z0-9]+-[a-z0-9]+$/;
