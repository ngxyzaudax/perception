import { getTool } from "../Tool.js";
import type { ToolRegistry } from "../Tool.js";
import type { PermissionContext } from "../permissions/checkPermission.js";
import type { Settings } from "../schemas/settings.js";
import type { ChatMessage, QueryEvent, ToolCall } from "../types/messages.js";
import { executeToolCall } from "./executeToolCall.js";
import type { QueryRuntimeExtras } from "./queryEngine.js";
import { syntheticToolResult } from "./sanitizeHistory.js";

export type ToolRunnerInput = {
  registry: ToolRegistry;
  settings: Settings;
  permissionContext: PermissionContext;
  signal?: AbortSignal;
  runtimeExtras?: QueryRuntimeExtras;
  onEvent: (event: QueryEvent) => void;
};

export type StreamingToolRunner = {
  observe: (toolCalls: ToolCall[]) => void;
  finish: (finalCalls: ToolCall[]) => Promise<ChatMessage[]>;
  startedCount: () => number;
};

const ABORTED_TOOL_MESSAGE = "Tool call aborted before completion.";

const cancelledToolMessage = (call: ToolCall): ChatMessage =>
  syntheticToolResult(call, ABORTED_TOOL_MESSAGE);

const awaitWithAbort = async (
  call: ToolCall,
  promise: Promise<ChatMessage>,
  signal?: AbortSignal,
): Promise<ChatMessage> => {
  if (!signal) {
    return promise;
  }
  if (signal.aborted) {
    return cancelledToolMessage(call);
  }
  return new Promise((resolve) => {
    const onAbort = (): void => {
      cleanup();
      resolve(cancelledToolMessage(call));
    };
    const cleanup = (): void => {
      signal.removeEventListener("abort", onAbort);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    void promise.then(
      (message) => {
        cleanup();
        resolve(message);
      },
      () => {
        cleanup();
        resolve(cancelledToolMessage(call));
      },
    );
  });
};

export const createStreamingToolRunner = (
  input: ToolRunnerInput,
): StreamingToolRunner => {
  const started = new Map<string, { call: ToolCall; promise: Promise<ChatMessage> }>();

  const execute = (call: ToolCall): Promise<ChatMessage> =>
    executeToolCall({
      call,
      registry: input.registry,
      settings: input.settings,
      permissionContext: input.permissionContext,
      signal: input.signal,
      runtimeExtras: input.runtimeExtras,
      onEvent: input.onEvent,
    });

  const tryStart = (call: ToolCall): void => {
    if (!call.id || !call.name || started.has(call.id)) {
      return;
    }
    if (!isStartableCall(call, input.registry)) {
      return;
    }
    started.set(call.id, { call, promise: execute(call) });
  };

  const observe = (toolCalls: ToolCall[]): void => {
    for (let index = 0; index < toolCalls.length - 1; index += 1) {
      tryStart(toolCalls[index]!);
    }
  };

  const finish = async (finalCalls: ToolCall[]): Promise<ChatMessage[]> => {
    for (const call of finalCalls) {
      tryStart(call);
    }
    const results = new Map<string, ChatMessage>();
    for (const [id, entry] of started) {
      results.set(id, await awaitWithAbort(entry.call, entry.promise, input.signal));
    }
    for (const call of finalCalls) {
      if (results.has(call.id)) {
        continue;
      }
      if (input.signal?.aborted) {
        results.set(call.id, cancelledToolMessage(call));
        continue;
      }
      results.set(call.id, await execute(call));
    }
    const merged = finalCalls
      .map((call) => results.get(call.id))
      .filter((message): message is ChatMessage => message !== undefined);
    for (const message of merged) {
      input.onEvent({ type: "message_complete", message });
    }
    return merged;
  };

  return { observe, finish, startedCount: () => started.size };
};

const isStartableCall = (call: ToolCall, registry: ToolRegistry): boolean => {
  const tool = getTool(registry, call.name);
  if (!tool) {
    return false;
  }
  try {
    const parsed = tool.inputSchema.parse(JSON.parse(call.arguments || "{}"));
    return (tool.isConcurrencySafe ?? tool.isReadOnly)(parsed);
  } catch {
    return false;
  }
};
