import type { ToolRegistry } from "../Tool.js";
import { getTool } from "../Tool.js";
import type { ToolCall } from "../types/messages.js";

export type ToolCallBatch = {
  calls: ToolCall[];
  concurrent: boolean;
};

export const partitionToolCalls = (
  calls: ToolCall[],
  registry: ToolRegistry,
): ToolCallBatch[] => {
  const batches: ToolCallBatch[] = [];
  let safeBatch: ToolCall[] = [];

  const flushSafe = (): void => {
    if (safeBatch.length === 0) {
      return;
    }
    batches.push({ calls: safeBatch, concurrent: safeBatch.length > 1 });
    safeBatch = [];
  };

  for (const call of calls) {
    if (isConcurrencySafeCall(call, registry)) {
      safeBatch.push(call);
      continue;
    }
    flushSafe();
    batches.push({ calls: [call], concurrent: false });
  }
  flushSafe();
  return batches;
};

const isConcurrencySafeCall = (call: ToolCall, registry: ToolRegistry): boolean => {
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
