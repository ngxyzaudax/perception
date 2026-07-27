import type OpenAI from "openai";
import type { Settings } from "../schemas/settings.js";
import type { ToolRegistry } from "../Tool.js";
import type { ChatMessage, QueryEvent } from "../types/messages.js";
import type { HooksConfig } from "../services/hooks/hookSchema.js";
import type { ToolCall } from "../types/messages.js";
import { compactConversation } from "../services/compact/compactConversation.js";
import { persistCompactSummary } from "../services/memory/sessionMemory.js";
import { runHookEvent } from "../services/hooks/runHooks.js";
import { getCwd } from "../utils/cwd.js";
import { collectAssistantTurn } from "./collectAssistantTurn.js";
import { isContextOverflowError } from "./contextOverflow.js";
import { recoverFromOverflow } from "./contextBudget.js";

export const MAX_STOP_HOOK_CONTINUATIONS = 3;
export const MAX_EMPTY_TURN_RETRIES = 2;

export const isEmptyTurn = (turn: {
  message: ChatMessage;
  toolCalls: unknown[];
}): boolean =>
  turn.toolCalls.length === 0 && turn.message.content.trim().length === 0;

export const tryReactiveCompact = async (
  settings: Settings,
  working: ChatMessage[],
  onEvent: (event: QueryEvent) => void,
  sessionId?: string,
  signal?: AbortSignal,
): Promise<boolean> => {
  onEvent({ type: "compacting" });
  onEvent({
    type: "status",
    message: "Context overflow detected. Compacting conversation and retrying request.",
  });
  try {
    const compacted = await compactConversation(settings, working.slice(1), signal);
    persistCompactSummary(sessionId, compacted);
    working.splice(0, working.length, working[0]!, ...compacted);
    onEvent({ type: "status", message: "Conversation compacted. Retrying request." });
    return true;
  } catch (error) {
    if (signal?.aborted) {
      return false;
    }
    onEvent({
      type: "status",
      message: `Reactive compaction failed: ${error instanceof Error ? error.message : "unknown error"}`,
    });
    return false;
  }
};

export const handleStopHook = async (input: {
  hooksConfig: HooksConfig;
  cwd?: string;
  working: ChatMessage[];
  continuations: number;
  onEvent: (event: QueryEvent) => void;
}): Promise<"done" | "continue"> => {
  if (input.continuations >= MAX_STOP_HOOK_CONTINUATIONS) {
    return "done";
  }
  const result = await runHookEvent(input.hooksConfig, {
    event: "Stop",
    cwd: input.cwd ?? getCwd(),
  });
  if (result.allowed) {
    return "done";
  }
  input.working.push({
    role: "user",
    content: `Stop hook blocked completion: ${result.reason}`,
  });
  input.onEvent({
    type: "status",
    message: `Stop hook requested continuation: ${result.reason}`,
  });
  return "continue";
};

export type CollectResult =
  | Awaited<ReturnType<typeof collectAssistantTurn>>
  | "retry"
  | "abort"
  | "fail";

export const collectOrRecover = async (args: {
  client: OpenAI;
  model: string;
  working: ChatMessage[];
  registry: ToolRegistry;
  settings: Settings;
  signal?: AbortSignal;
  maxContextTokens: number;
  reactiveCompactUsed: boolean;
  overflowRecoveryUsed: boolean;
  sessionId?: string;
  onEvent: (event: QueryEvent) => void;
  onReactiveCompact: () => void;
  onOverflowTrim: () => void;
  onToolCalls?: (toolCalls: ToolCall[]) => void;
}): Promise<CollectResult> => {
  try {
    return await collectAssistantTurn({
      client: args.client,
      model: args.model,
      messages: args.working,
      registry: args.registry,
      signal: args.signal,
      onEvent: args.onEvent,
      onToolCalls: args.onToolCalls,
    });
  } catch (error) {
    if (args.signal?.aborted) {
      return "abort";
    }
    if (isContextOverflowError(error) && !args.reactiveCompactUsed) {
      args.onReactiveCompact();
      if (
        await tryReactiveCompact(args.settings, args.working, args.onEvent, args.sessionId, args.signal)
      ) {
        return "retry";
      }
      if (args.signal?.aborted) {
        return "abort";
      }
    }
    if (!args.overflowRecoveryUsed && isContextOverflowError(error)) {
      args.onOverflowTrim();
      args.working.splice(
        0,
        args.working.length,
        ...recoverFromOverflow(args.working, args.maxContextTokens),
      );
      args.onEvent({
        type: "error",
        message:
          "Context overflow detected. Oversized tool outputs truncated and old messages trimmed, retrying request.",
      });
      return "retry";
    }
    const failure = `Request failed: ${error instanceof Error ? error.message : "unknown error"}`;
    const failureMessage: ChatMessage = { role: "assistant", content: failure };
    args.working.push(failureMessage);
    args.onEvent({ type: "error", message: failure });
    args.onEvent({ type: "message_complete", message: failureMessage });
    return "fail";
  }
};
