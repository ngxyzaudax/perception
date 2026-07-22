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
  let readOnlyBatch: ToolCall[] = [];

  const flushReadOnly = (): void => {
    if (readOnlyBatch.length === 0) {
      return;
    }
    batches.push({ calls: readOnlyBatch, concurrent: readOnlyBatch.length > 1 });
    readOnlyBatch = [];
  };

  for (const call of calls) {
    if (isReadOnlyCall(call, registry)) {
      readOnlyBatch.push(call);
      continue;
    }
    flushReadOnly();
    batches.push({ calls: [call], concurrent: false });
  }
  flushReadOnly();
  return batches;
};

const isReadOnlyCall = (call: ToolCall, registry: ToolRegistry): boolean => {
  const tool = getTool(registry, call.name);
  if (!tool) {
    return false;
  }
  try {
    const parsed = tool.inputSchema.parse(JSON.parse(call.arguments || "{}"));
    return tool.isReadOnly(parsed);
  } catch {
    return false;
  }
};
