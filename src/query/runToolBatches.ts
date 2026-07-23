import type { ToolRegistry } from "../Tool.js";
import type { PermissionContext } from "../permissions/checkPermission.js";
import type { Settings } from "../schemas/settings.js";
import type { ChatMessage, QueryEvent, ToolCall } from "../types/messages.js";
import { executeToolCall } from "./executeToolCall.js";
import { partitionToolCalls } from "./partitionToolCalls.js";
import type { QueryRuntimeExtras } from "./queryEngine.js";

export type ToolBatchInput = {
  toolCalls: ToolCall[];
  registry: ToolRegistry;
  settings: Settings;
  permissionContext: PermissionContext;
  signal?: AbortSignal;
  runtimeExtras?: QueryRuntimeExtras;
  onEvent: (event: QueryEvent) => void;
};

const executeCall = (input: ToolBatchInput, call: ToolCall): Promise<ChatMessage> =>
  executeToolCall({
    call,
    registry: input.registry,
    settings: input.settings,
    permissionContext: input.permissionContext,
    signal: input.signal,
    runtimeExtras: input.runtimeExtras,
    onEvent: input.onEvent,
  });

export const runToolBatches = async (input: ToolBatchInput): Promise<ChatMessage[]> => {
  const results: ChatMessage[] = [];
  const batches = partitionToolCalls(input.toolCalls, input.registry);
  for (const batch of batches) {
    const messages = batch.concurrent
      ? await Promise.all(batch.calls.map((call) => executeCall(input, call)))
      : await runSequential(input, batch.calls);
    for (const message of messages) {
      results.push(message);
      input.onEvent({ type: "message_complete", message });
    }
  }
  return results;
};

const runSequential = async (
  input: ToolBatchInput,
  calls: ToolCall[],
): Promise<ChatMessage[]> => {
  const messages: ChatMessage[] = [];
  for (const call of calls) {
    messages.push(await executeCall(input, call));
  }
  return messages;
};
