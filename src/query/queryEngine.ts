import { buildSystemPrompt } from "../context/systemPrompt.js";
import { createLlmClient, resolveModel } from "../services/llm/client.js";
import { isUserPermissionRejectContent } from "../permissions/permissionMessages.js";
import type { ChatMessage } from "../types/messages.js";
import { createStreamingToolRunner } from "./streamingToolRunner.js";
import { prepareWorking } from "./midQueryCompact.js";
import { missingToolResults } from "./sanitizeHistory.js";
import {
  collectOrRecover,
  handleStopHook,
  isEmptyTurn,
  MAX_EMPTY_TURN_RETRIES,
} from "./queryRecovery.js";
import type { QueryInput, QueryResult } from "./queryTypes.js";

export type { QueryInput, QueryResult, QueryRuntimeExtras } from "./queryTypes.js";

const DEFAULT_MAX_TURNS = 100;

export { DEFAULT_MAX_TURNS };

export const runQuery = async (input: QueryInput): Promise<QueryResult> => {
  const client = createLlmClient(input.settings);
  const resolved = await resolveModel(client, input.settings.model);
  const systemPrompt = input.systemPromptOverride ?? (await buildSystemPrompt(input.runtimeExtras?.cwd));
  const working: ChatMessage[] = [{ role: "system", content: systemPrompt }, ...input.messages];
  const maxTurns = input.maxTurns ?? DEFAULT_MAX_TURNS;
  let turnCount = 0;
  let overflowRecoveryUsed = false;
  let reactiveCompactUsed = false;
  let compactedAtRequestCount = -1;
  let emptyTurnRetries = 0;
  let stopHookContinuations = 0;
  let compactFailures = 0;

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
    const prepared = await prepareWorking({
      settings: input.settings,
      working,
      maxContextTokens: resolved.maxContextTokens,
      compactedAtRequestCount,
      compactFailures,
      sessionId: input.runtimeExtras?.sessionId,
      onEvent: input.onEvent,
    });
    compactedAtRequestCount = prepared.compactedAtRequestCount;
    compactFailures = prepared.compactFailures;
    const toolRunner = createStreamingToolRunner({
      registry: input.registry,
      settings: input.settings,
      permissionContext: input.permissionContext,
      signal: input.signal,
      runtimeExtras: input.runtimeExtras,
      onEvent: input.onEvent,
    });
    const assistant = await collectOrRecover({
      client,
      model: resolved.modelId,
      working,
      registry: input.registry,
      settings: input.settings,
      signal: input.signal,
      maxContextTokens: resolved.maxContextTokens,
      reactiveCompactUsed,
      overflowRecoveryUsed,
      sessionId: input.runtimeExtras?.sessionId,
      onEvent: input.onEvent,
      onToolCalls: toolRunner.observe,
      onReactiveCompact: () => {
        reactiveCompactUsed = true;
      },
      onOverflowTrim: () => {
        overflowRecoveryUsed = true;
      },
    });
    if (assistant === "retry") {
      continue;
    }
    if (assistant === "abort" || assistant === "fail") {
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
      const stopDecision = await handleStopHook({
        hooksConfig: input.runtimeExtras?.hooksConfig ?? input.settings.hooks ?? {},
        cwd: input.runtimeExtras?.cwd,
        working,
        continuations: stopHookContinuations,
        onEvent: input.onEvent,
      });
      if (stopDecision === "continue") {
        stopHookContinuations += 1;
        continue;
      }
      input.onEvent({ type: "done" });
      return { messages: working.slice(1) };
    }
    emptyTurnRetries = 0;
    if (input.signal?.aborted) {
      working.push(...missingToolResults(assistant.message));
      return { messages: working.slice(1) };
    }
    const toolMessages = await toolRunner.finish(assistant.toolCalls);
    working.push(...toolMessages);
    if (
      input.signal?.aborted ||
      toolMessages.some((message) => isUserPermissionRejectContent(message.content))
    ) {
      working.push(...missingToolResults(assistant.message, toolMessages));
      return { messages: working.slice(1) };
    }
  }
};
