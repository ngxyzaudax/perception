import type { ChatMessage } from "../../types/messages.js";

const AUTOCOMPACT_BUFFER_TOKENS = 13000;
const MAX_OUTPUT_RESERVE_TOKENS = 20000;
const DEFAULT_MAX_OUTPUT_TOKENS = 16384;
const ESTIMATED_CHARS_PER_TOKEN = 4;

export const MAX_COMPACT_FAILURES = 3;

export const estimatePromptTokens = (
  lastPromptTokens: number,
  messages: ChatMessage[],
): number => {
  const totalChars = messages.reduce(
    (total, message) => total + estimateMessageChars(message),
    0,
  );
  return Math.max(lastPromptTokens, Math.ceil(totalChars / ESTIMATED_CHARS_PER_TOKEN));
};

export const estimateMessageChars = (message: ChatMessage): number => {
  const content = message.content?.length ?? 0;
  if (message.role !== "assistant" || !message.toolCalls) {
    return content;
  }
  return (
    content +
    message.toolCalls.reduce(
      (sum, call) => sum + call.name.length + call.arguments.length,
      0,
    )
  );
};

export const getEffectiveContextWindow = (
  maxContextTokens: number,
  maxOutputTokens: number = DEFAULT_MAX_OUTPUT_TOKENS,
): number => maxContextTokens - Math.min(maxOutputTokens, MAX_OUTPUT_RESERVE_TOKENS);

export const getAutoCompactThreshold = (
  maxContextTokens: number,
  maxOutputTokens: number = DEFAULT_MAX_OUTPUT_TOKENS,
): number =>
  getEffectiveContextWindow(maxContextTokens, maxOutputTokens) - AUTOCOMPACT_BUFFER_TOKENS;

export const shouldAutoCompact = (
  lastPromptTokens: number,
  maxContextTokens: number,
  maxOutputTokens: number = DEFAULT_MAX_OUTPUT_TOKENS,
  compactFailures: number = 0,
): boolean => {
  if (compactFailures >= MAX_COMPACT_FAILURES) {
    return false;
  }
  return lastPromptTokens >= getAutoCompactThreshold(maxContextTokens, maxOutputTokens);
};
