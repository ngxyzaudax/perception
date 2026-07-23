import { estimatePromptTokens, shouldAutoCompact } from "../services/compact/autoCompact.js";
import { compactConversation } from "../services/compact/compactConversation.js";
import { isWithinSendBudget, recoverFromOverflow } from "./contextBudget.js";
import { healWorkingHistory } from "./sanitizeHistory.js";
import { getUsage } from "../state/usage.js";
import type { Settings } from "../schemas/settings.js";
import type { ChatMessage, QueryEvent } from "../types/messages.js";

export const shouldCompactWorking = (
  lastPromptTokens: number,
  history: ChatMessage[],
  maxContextTokens: number,
): boolean =>
  history.length > 0 &&
  shouldAutoCompact(estimatePromptTokens(lastPromptTokens, history), maxContextTokens);

export const freshPromptTokens = (compactedAtRequestCount: number): number =>
  getUsage().requestCount > compactedAtRequestCount ? getUsage().lastPromptTokens : 0;

type WorkingPrep = {
  settings: Settings;
  working: ChatMessage[];
  maxContextTokens: number;
  compactedAtRequestCount: number;
  onEvent: (event: QueryEvent) => void;
};

export const prepareWorking = async (input: WorkingPrep): Promise<number> => {
  healWorkingHistory({ working: input.working, onEvent: input.onEvent });
  const compactedAtRequestCount = await compactWorkingIfNeeded(input);
  enforceWorkingBudget({
    working: input.working,
    maxContextTokens: input.maxContextTokens,
    onEvent: input.onEvent,
  });
  return compactedAtRequestCount;
};

const compactWorkingIfNeeded = async (input: WorkingPrep): Promise<number> => {
  const promptTokens = freshPromptTokens(input.compactedAtRequestCount);
  if (!shouldCompactWorking(promptTokens, input.working.slice(1), input.maxContextTokens)) {
    return input.compactedAtRequestCount;
  }
  const compacted = await compactWorkingHistory({
    settings: input.settings,
    systemMessage: input.working[0]!,
    history: input.working.slice(1),
    onEvent: input.onEvent,
  });
  if (!compacted) {
    return input.compactedAtRequestCount;
  }
  input.working.splice(0, input.working.length, ...compacted);
  return getUsage().requestCount;
};

export const enforceWorkingBudget = (input: {
  working: ChatMessage[];
  maxContextTokens: number;
  onEvent: (event: QueryEvent) => void;
}): void => {
  if (isWithinSendBudget(input.working, input.maxContextTokens)) {
    return;
  }
  const bounded = recoverFromOverflow(input.working, input.maxContextTokens);
  const droppedCount = input.working.length - bounded.length;
  input.onEvent({
    type: "status",
    message: droppedCount > 0
      ? `Trimmed ${droppedCount} oldest messages and shrank tool outputs to fit the context window.`
      : "Shrank oversized tool outputs to fit the context window.",
  });
  input.working.splice(0, input.working.length, ...bounded);
};

const compactWorkingHistory = async (input: {
  settings: Settings;
  systemMessage: ChatMessage;
  history: ChatMessage[];
  onEvent: (event: QueryEvent) => void;
}): Promise<ChatMessage[] | null> => {
  input.onEvent({
    type: "status",
    message: "Context threshold reached, compacting conversation history.",
  });
  try {
    const compacted = await compactConversation(input.settings, input.history);
    return [input.systemMessage, ...compacted];
  } catch (error) {
    input.onEvent({
      type: "status",
      message: `Compaction failed, continuing with full history: ${error instanceof Error ? error.message : "unknown error"}`,
    });
    return null;
  }
};
