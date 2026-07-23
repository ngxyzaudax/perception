import type { DisplayMessage } from "../types/displayMessages.js";

const READ_BURST_TOOLS = new Set(["Read", "Grep", "Glob", "LSP", "TaskOutput"]);

export const isReadBurstTool = (message: DisplayMessage): boolean =>
  message.role === "tool" &&
  READ_BURST_TOOLS.has(message.name) &&
  message.isError !== true;

export const isBurstContinuation = (
  messages: DisplayMessage[],
  index: number,
): boolean => {
  const current = messages[index];
  if (!current || !isReadBurstTool(current)) {
    return false;
  }
  const previous = messages[index - 1];
  return previous !== undefined && isReadBurstTool(previous);
};
