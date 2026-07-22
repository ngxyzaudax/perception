export const readReasoningContent = (delta: unknown): string | undefined => {
  if (typeof delta !== "object" || delta === null) {
    return undefined;
  }
  const value = (delta as { reasoning_content?: unknown }).reasoning_content;
  return typeof value === "string" && value.length > 0 ? value : undefined;
};
