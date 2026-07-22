const COMPACT_THRESHOLD = 0.75;

export const shouldAutoCompact = (
  lastPromptTokens: number,
  maxContextTokens: number,
): boolean => lastPromptTokens >= Math.floor(maxContextTokens * COMPACT_THRESHOLD);
