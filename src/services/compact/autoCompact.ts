import type { ChatMessage } from "../../types/messages.js";

const COMPACT_THRESHOLD = 0.75;
const ESTIMATED_CHARS_PER_TOKEN = 4;

export const estimatePromptTokens = (
  lastPromptTokens: number,
  messages: ChatMessage[],
): number => {
  const totalChars = messages.reduce(
    (total, message) => total + (message.content?.length ?? 0),
    0,
  );
  return Math.max(lastPromptTokens, Math.ceil(totalChars / ESTIMATED_CHARS_PER_TOKEN));
};

export const shouldAutoCompact = (
  lastPromptTokens: number,
  maxContextTokens: number,
): boolean => lastPromptTokens >= Math.floor(maxContextTokens * COMPACT_THRESHOLD);
