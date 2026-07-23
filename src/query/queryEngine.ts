import type { Settings } from "../schemas/settings.js";
import { buildSystemPrompt } from "../context/systemPrompt.js";
import { createLlmClient, resolveModel } from "../services/llm/client.js";
import type { ToolRegistry } from "../Tool.js";
import type { PermissionContext } from "../permissions/checkPermission.js";
import type { ChatMessage, QueryEvent } from "../types/messages.js";
import type { HooksConfig } from "../services/hooks/hookSchema.js";
import type { PermissionMode } from "../types/permissions.js";
import { collectAssistantTurn } from "./collectAssistantTurn.js";
import { runToolBatches } from "./runToolBatches.js";
import { isContextOverflowError } from "./contextOverflow.js";
import { recoverFromOverflow } from "./contextBudget.js";
import { compactWorkingIfNeeded, enforceWorkingBudget } from "./midQueryCompact.js";

export type QueryRuntimeExtras = {
  sessionId?: string;
  hooksConfig?: HooksConfig;
  updatePermissionMode?: (mode: PermissionMode) => void;
  requestQuestion?: (question: string, options: string[]) => Promise<string>;
  coordinatorMode?: boolean;
  cwd?: string;
  agentScope?: string;
};

export type QueryInput = {
  settings: Settings;
  registry: ToolRegistry;
  messages: ChatMessage[];
  permissionContext: PermissionContext;
  signal?: AbortSignal;
  systemPromptOverride?: string;
  runtimeExtras?: QueryRuntimeExtras;
  maxTurns?: number;
  onEvent: (event: QueryEvent) => void;
};

export type QueryResult = {
  messages: ChatMessage[];
};

const DEFAULT_MAX_TURNS = 100;
const MAX_EMPTY_TURN_RETRIES = 2;

export { DEFAULT_MAX_TURNS };

const isEmptyTurn = (turn: { message: ChatMessage; toolCalls: unknown[] }): boolean =>
  turn.toolCalls.length === 0 && turn.message.content.trim().length === 0;

export const runQuery = async (input: QueryInput): Promise<QueryResult> => {
  const client = createLlmClient(input.settings);
  const resolved = await resolveModel(client, input.settings.model);
  const systemPrompt = input.systemPromptOverride ?? (await buildSystemPrompt(input.runtimeExtras?.cwd));
  const working: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...input.messages,
  ];
  const maxTurns = input.maxTurns ?? DEFAULT_MAX_TURNS;
  let turnCount = 0;
  let overflowRecoveryUsed = false;
  let compactedAtRequestCount = -1;
  let emptyTurnRetries = 0;

  while (true) {
    if (input.signal?.aborted) {
      return { messages: working.slice(1) };
    }

    turnCount += 1;
    if (turnCount > maxTurns) {
      working.push({ role: "assistant", content: "Turn limit reached" });
      input.onEvent({ type: "error", message: "Turn limit reached" });
      return { messages: working.slice(1) };
    }

    compactedAtRequestCount = await compactWorkingIfNeeded({
      settings: input.settings,
      working,
      maxContextTokens: resolved.maxContextTokens,
      compactedAtRequestCount,
      onEvent: input.onEvent,
    });
    enforceWorkingBudget({
      working,
      maxContextTokens: resolved.maxContextTokens,
      onEvent: input.onEvent,
    });

    let assistant: Awaited<ReturnType<typeof collectAssistantTurn>>;
    try {
      assistant = await collectAssistantTurn({
        client,
        model: resolved.modelId,
        messages: working,
        registry: input.registry,
        signal: input.signal,
        onEvent: input.onEvent,
      });
    } catch (error) {
      if (input.signal?.aborted) {
        return { messages: working.slice(1) };
      }
      if (!overflowRecoveryUsed && isContextOverflowError(error)) {
        overflowRecoveryUsed = true;
        working.splice(0, working.length, ...recoverFromOverflow(working, resolved.maxContextTokens));
        input.onEvent({
          type: "error",
          message: "Context overflow detected. Oversized tool outputs truncated and old messages trimmed, retrying request.",
        });
        continue;
      }
      const failure = `Request failed: ${error instanceof Error ? error.message : "unknown error"}`;
      const failureMessage: ChatMessage = { role: "assistant", content: failure };
      working.push(failureMessage);
      input.onEvent({ type: "error", message: failure });
      input.onEvent({ type: "message_complete", message: failureMessage });
      return { messages: working.slice(1) };
    }
    if (isEmptyTurn(assistant) && emptyTurnRetries < MAX_EMPTY_TURN_RETRIES) {
      emptyTurnRetries += 1;
      input.onEvent({
        type: "status",
        message: `Model returned an empty response, retrying request (attempt ${emptyTurnRetries} of ${MAX_EMPTY_TURN_RETRIES}).`,
      });
      continue;
    }
    working.push(assistant.message);
    input.onEvent({ type: "message_complete", message: assistant.message });

    if (assistant.toolCalls.length === 0) {
      input.onEvent({ type: "done" });
      return { messages: working.slice(1) };
    }
    emptyTurnRetries = 0;

    if (input.signal?.aborted) {
      return { messages: working.slice(1) };
    }

    const toolMessages = await runToolBatches({
      toolCalls: assistant.toolCalls,
      registry: input.registry,
      settings: input.settings,
      permissionContext: input.permissionContext,
      signal: input.signal,
      runtimeExtras: input.runtimeExtras,
      onEvent: input.onEvent,
    });
    working.push(...toolMessages);
  }
};
