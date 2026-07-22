export const symbols = {
  bullet: "⏺",
  prompt: "❯",
  branch: "⎿",
  cross: "✗",
  spinner: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
} as const;

export const colors = {
  accent: "cyan",
  user: "yellow",
  assistant: "green",
  tool: "magenta",
  status: "blue",
  error: "red",
  warning: "yellow",
  success: "green",
  dim: "gray",
  diffAdd: "green",
  diffRemove: "red",
  diffContext: "gray",
  border: "gray",
  highlight: "cyan",
} as const;

export type ThemeColor = (typeof colors)[keyof typeof colors];

export const permissionModeColors = {
  default: "green",
  plan: "yellow",
  bypassPermissions: "red",
} as const;

export const contextUsageColor = (percent: number): ThemeColor =>
  percent >= 80 ? "red" : percent >= 60 ? "yellow" : "green";
