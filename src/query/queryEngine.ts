import type { Settings } from "../schemas/settings.js";
import { buildSystemPrompt } from "../context/systemPrompt.js";
import { createLlmClient, resolveModelId } from "../services/llm/client.js";
import type { ToolRegistry } from "../Tool.js";
import type { PermissionContext } from "../permissions/checkPermission.js";
import type { ChatMessage, QueryEvent } from "../types/messages.js";
import type { HooksConfig } from "../services/hooks/hookSchema.js";
import type { PermissionMode } from "../types/permissions.js";
import { collectAssistantTurn } from "./collectAssistantTurn.js";
import { executeToolCall } from "./executeToolCall.js";
import { partitionToolCalls } from "./partitionToolCalls.js";

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

export { DEFAULT_MAX_TURNS };

export const runQuery = async (input: QueryInput): Promise<QueryResult> => {
  const client = createLlmClient(input.settings);
  const model = await resolveModelId(client, input.settings.model);
  const systemPrompt = input.systemPromptOverride ?? (await buildSystemPrompt(input.runtimeExtras?.cwd));
  const working: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...input.messages,
  ];
  const maxTurns = input.maxTurns ?? DEFAULT_MAX_TURNS;
  let turnCount = 0;

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

    const assistant = await collectAssistantTurn({
      client,
      model,
      messages: working,
      registry: input.registry,
      signal: input.signal,
      onEvent: input.onEvent,
    });
    working.push(assistant.message);

    if (assistant.toolCalls.length === 0) {
      input.onEvent({ type: "done" });
      return { messages: working.slice(1) };
    }

    if (input.signal?.aborted) {
      return { messages: working.slice(1) };
    }

    const batches = partitionToolCalls(assistant.toolCalls, input.registry);
    for (const batch of batches) {
      if (batch.concurrent) {
        const results = await Promise.all(
          batch.calls.map((call) =>
            executeToolCall({
              call,
              registry: input.registry,
              settings: input.settings,
              permissionContext: input.permissionContext,
              signal: input.signal,
              runtimeExtras: input.runtimeExtras,
              onEvent: input.onEvent,
            }),
          ),
        );
        working.push(...results);
        continue;
      }
      for (const call of batch.calls) {
        working.push(
          await executeToolCall({
            call,
            registry: input.registry,
            settings: input.settings,
            permissionContext: input.permissionContext,
            signal: input.signal,
            runtimeExtras: input.runtimeExtras,
            onEvent: input.onEvent,
          }),
        );
      }
    }
  }
};
