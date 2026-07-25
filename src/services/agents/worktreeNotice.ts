export type WorktreeNoticeInput = {
  worktreePath: string;
  branch?: string;
};

export type WorktreePromptContext = {
  cwd: string;
  branch?: string;
  isolated: boolean;
};

export const buildWorktreeNotice = (input: WorktreeNoticeInput): string => {
  const branchLine = input.branch ? ` on branch ${input.branch}` : "";
  return [
    `You are operating in an isolated git worktree at ${input.worktreePath}${branchLine}.`,
    "This worktree is a complete copy of the repository with the same relative layout (src/, package.json, and so on).",
    "Everything you need is already inside this worktree; do not rely on any path outside it.",
    "Use paths relative to this worktree root, or absolute paths that stay within it.",
    "Absolute paths pointing to the parent repository are outside your working directory and will be rejected.",
    "Your changes stay in this worktree and are committed to its branch when you finish.",
  ].join(" ");
};

export const prependWorktreeNotice = (
  prompt: string,
  input: WorktreeNoticeInput,
): string => `${buildWorktreeNotice(input)}\n\n${prompt}`;

export const applyWorktreeNotice = (
  prompt: string,
  context: WorktreePromptContext,
): string =>
  context.isolated
    ? prependWorktreeNotice(prompt, {
        worktreePath: context.cwd,
        branch: context.branch,
      })
    : prompt;
