export const compactToolOutput = (
  content: string,
  maxLines: number = 6,
): { preview: string; hiddenLines: number } => {
  const lines = content.split("\n");
  if (lines.length <= maxLines) {
    return { preview: content, hiddenLines: 0 };
  }
  const preview = lines.slice(0, maxLines).join("\n");
  return { preview, hiddenLines: lines.length - maxLines };
};

export const buildInitPrompt = (): string =>
  [
    "Explore this project using Read, Glob, and Grep.",
    "Write a concise project brief covering purpose, layout, key entry points, and conventions.",
    "Return only the markdown brief with no preamble.",
  ].join(" ");
