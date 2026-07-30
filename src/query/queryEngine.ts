import { buildSystemPrompt } from "../context/systemPrompt.js";
import { createLlmClient, resolveModel } from "../services/llm/client.js";
import { isUserPermissionRejectContent } from "../permissions/permissionMessages.js";
import { getUsage } from "../state/usage.js";
import type { ChatMessage } from "../types/messages.js";
import { createStreamingToolRunner } from "./streamingToolRunner.js";
import { prepareWorking } from "./midQueryCompact.js";
import { missingToolResults } from "./sanitizeHistory.js";
import { collectOrRecover, handleStopHook } from "./queryRecovery.js";
import type { QueryInput, QueryResult } from "./queryTypes.js";
import {
  createMaxTurnsResult,
  emitMaxTurnsReached,
  hasReachedTurnLimit,
  nextAgenticTurn,
} from "./turnLimits.js";

export type { QueryInput, QueryResult, QueryRuntimeExtras } from "./queryTypes.js";

export const runQuery = async (input: QueryInput): Promise<QueryResult> => {
  const client = createLlmClient(input.settings);
  const resolved = await resolveModel(client, input.settings.model);
  const systemPrompt = input.systemPromptOverride ?? (await buildSystemPrompt(input.runtimeExtras?.cwd));
  const working: ChatMessage[] = [{ role: "system", content: systemPrompt }, ...input.messages];
  const maxTurns = input.maxTurns;
  let turnCount = 1;
  let overflowRecoveryUsed = false;
  let reactiveCompactUsed = false;
  let compactedAtRequestCount = getUsage().requestCount;
  let stopHookContinuations = 0;
  let compactFailures = 0;

  while (true) {
    if (input.signal?.aborted) {
      return { messages: working.slice(1), reason: "aborted", turnCount };
    }
    input.onEvent({ type: "preparing" });
    const prepared = await prepareWorking({
      settings: input.settings,
      working,
      maxContextTokens: resolved.maxContextTokens,
      compactedAtRequestCount,
      compactFailures,
      sessionId: input.runtimeExtras?.sessionId,
      signal: input.signal,
      onEvent: input.onEvent,
    });
    compactedAtRequestCount = prepared.compactedAtRequestCount;
    compactFailures = prepared.compactFailures;
    if (input.signal?.aborted) {
      return { messages: working.slice(1), reason: "aborted", turnCount };
    }
    const toolRunner = createStreamingToolRunner({
      registry: input.registry,
      settings: input.settings,
      permissionContext: input.permissionContext,
      signal: input.signal,
      runtimeExtras: input.runtimeExtras,
      onEvent: input.onEvent,
    });
    input.onEvent({ type: "requesting" });
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
      return {
        messages: working.slice(1),
        reason: assistant === "fail" ? "model_error" : "aborted",
        turnCount,
      };
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
      return { messages: working.slice(1), reason: "completed", turnCount };
    }
    if (input.signal?.aborted) {
      working.push(...missingToolResults(assistant.message));
      return { messages: working.slice(1), reason: "aborted", turnCount };
    }
    const toolMessages = await toolRunner.finish(assistant.toolCalls);
    working.push(...toolMessages);
    const nextTurnCount = nextAgenticTurn(turnCount);
    if (input.signal?.aborted) {
      working.push(...missingToolResults(assistant.message, toolMessages));
      if (hasReachedTurnLimit(maxTurns, nextTurnCount)) {
        emitMaxTurnsReached(maxTurns, nextTurnCount, input.onEvent);
      }
      return { messages: working.slice(1), reason: "aborted", turnCount };
    }
    if (toolMessages.some((message) => isUserPermissionRejectContent(message.content))) {
      working.push(...missingToolResults(assistant.message, toolMessages));
      return { messages: working.slice(1), reason: "permission_rejected", turnCount };
    }
    if (hasReachedTurnLimit(maxTurns, nextTurnCount)) {
      return createMaxTurnsResult(working.slice(1), maxTurns, nextTurnCount, input.onEvent);
    }
    reactiveCompactUsed = false;
    overflowRecoveryUsed = false;
    turnCount = nextTurnCount;
  }
};
