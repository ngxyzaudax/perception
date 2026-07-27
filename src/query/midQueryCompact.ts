import {
  estimatePromptTokens,
  MAX_COMPACT_FAILURES,
  shouldAutoCompact,
} from "../services/compact/autoCompact.js";
import { compactConversation } from "../services/compact/compactConversation.js";
import {
  countClearedToolResults,
  microCompactMessages,
} from "../services/compact/microCompact.js";
import { enforceWorkingBudget } from "./contextBudget.js";
import { healWorkingHistory } from "./sanitizeHistory.js";
import { getUsage } from "../state/usage.js";
import { persistCompactSummary } from "../services/memory/sessionMemory.js";
import type { Settings } from "../schemas/settings.js";
import type { ChatMessage, QueryEvent } from "../types/messages.js";

export const MAX_WORKING_MESSAGES = 2000;

export const shouldCompactWorking = (
  lastPromptTokens: number,
  history: ChatMessage[],
  maxContextTokens: number,
  compactFailures: number = 0,
): boolean => {
  if (history.length === 0 || compactFailures >= MAX_COMPACT_FAILURES) {
    return false;
  }
  const promptTokens = estimatePromptTokens(lastPromptTokens, history);
  return (
    history.length > MAX_WORKING_MESSAGES ||
    shouldAutoCompact(promptTokens, maxContextTokens)
  );
};

export const freshPromptTokens = (compactedAtRequestCount: number): number =>
  getUsage().requestCount > compactedAtRequestCount ? getUsage().lastPromptTokens : 0;

type WorkingPrep = {
  settings: Settings;
  working: ChatMessage[];
  maxContextTokens: number;
  compactedAtRequestCount: number;
  compactFailures: number;
  sessionId?: string;
  signal?: AbortSignal;
  onEvent: (event: QueryEvent) => void;
};

export type PrepareWorkingResult = {
  compactedAtRequestCount: number;
  compactFailures: number;
};

export const prepareWorking = async (input: WorkingPrep): Promise<PrepareWorkingResult> => {
  healWorkingHistory({ working: input.working, onEvent: input.onEvent });
  const microCompacted = applyMicroCompact(input);
  const compacted = await compactWorkingIfNeeded({
    ...input,
    compactedAtRequestCount: microCompacted
      ? getUsage().requestCount
      : input.compactedAtRequestCount,
  });
  enforceWorkingBudget({
    working: input.working,
    maxContextTokens: input.maxContextTokens,
    onEvent: input.onEvent,
  });
  return compacted;
};

const applyMicroCompact = (input: WorkingPrep): boolean => {
  const promptTokens = freshPromptTokens(input.compactedAtRequestCount);
  if (
    !shouldCompactWorking(
      promptTokens,
      input.working.slice(1),
      input.maxContextTokens,
      input.compactFailures,
    )
  ) {
    return false;
  }
  const before = input.working.slice();
  const after = [input.working[0]!, ...microCompactMessages(input.working.slice(1))];
  const cleared = countClearedToolResults(before, after);
  if (cleared === 0) {
    return false;
  }
  input.onEvent({
    type: "status",
    message: `Cleared ${cleared} old tool result(s) to free context.`,
  });
  input.working.splice(0, input.working.length, ...after);
  return true;
};

const compactWorkingIfNeeded = async (input: WorkingPrep): Promise<PrepareWorkingResult> => {
  const promptTokens = freshPromptTokens(input.compactedAtRequestCount);
  if (
    !shouldCompactWorking(
      promptTokens,
      input.working.slice(1),
      input.maxContextTokens,
      input.compactFailures,
    )
  ) {
    return {
      compactedAtRequestCount: input.compactedAtRequestCount,
      compactFailures: input.compactFailures,
    };
  }
  input.onEvent({ type: "compacting" });
  input.onEvent({
    type: "status",
    message: "Context threshold reached, compacting conversation history.",
  });
  try {
    const compacted = await compactConversation(
      input.settings,
      input.working.slice(1),
      input.signal,
    );
    persistCompactSummary(input.sessionId, compacted);
    input.working.splice(0, input.working.length, input.working[0]!, ...compacted);
    input.onEvent({ type: "status", message: "Conversation compacted. Continuing request." });
    return {
      compactedAtRequestCount: getUsage().requestCount,
      compactFailures: 0,
    };
  } catch (error) {
    if (input.signal?.aborted) {
      return {
        compactedAtRequestCount: input.compactedAtRequestCount,
        compactFailures: input.compactFailures,
      };
    }
    input.onEvent({
      type: "status",
      message: `Compaction failed, continuing with full history: ${error instanceof Error ? error.message : "unknown error"}`,
    });
    return {
      compactedAtRequestCount: input.compactedAtRequestCount,
      compactFailures: input.compactFailures + 1,
    };
  }
};

