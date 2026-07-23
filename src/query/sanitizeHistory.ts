import type { ChatMessage, QueryEvent, ToolCall } from "../types/messages.js";

type ToolMessage = Extract<ChatMessage, { role: "tool" }>;

const hasValidJsonArguments = (call: ToolCall): boolean => {
  try {
    JSON.parse(call.arguments || "{}");
    return true;
  } catch {
    return false;
  }
};

const repairToolCall = (call: ToolCall): ToolCall =>
  hasValidJsonArguments(call) ? call : { ...call, arguments: "{}" };

const repairAssistantArguments = (message: ChatMessage): ChatMessage => {
  if (message.role !== "assistant" || !message.toolCalls) {
    return message;
  }
  const repaired = message.toolCalls.map(repairToolCall);
  const changed = repaired.some((call, index) => call !== message.toolCalls![index]);
  return changed ? { ...message, toolCalls: repaired } : message;
};

const syntheticToolResult = (call: ToolCall): ToolMessage => ({
  role: "tool",
  toolCallId: call.id,
  name: call.name,
  content: "Tool call was not completed; recovered during history sanitization.",
  isError: true,
});

const takeFollowingToolMessages = (
  messages: ChatMessage[],
  start: number,
): { toolMessages: ToolMessage[]; nextIndex: number } => {
  let index = start;
  const toolMessages: ToolMessage[] = [];
  while (index < messages.length && messages[index]!.role === "tool") {
    toolMessages.push(messages[index] as ToolMessage);
    index += 1;
  }
  return { toolMessages, nextIndex: index };
};

const pairedResults = (toolCalls: ToolCall[], toolMessages: ToolMessage[]): ToolMessage[] => {
  const byId = new Map(toolMessages.map((message) => [message.toolCallId, message]));
  return toolCalls.map((call) => byId.get(call.id) ?? syntheticToolResult(call));
};

export const sanitizeHistory = (messages: ChatMessage[]): ChatMessage[] => {
  const repaired = messages.map(repairAssistantArguments);
  const result: ChatMessage[] = [];
  let index = 0;
  while (index < repaired.length) {
    const message = repaired[index]!;
    if (message.role === "assistant" && message.toolCalls && message.toolCalls.length > 0) {
      const { toolMessages, nextIndex } = takeFollowingToolMessages(repaired, index + 1);
      result.push(message, ...pairedResults(message.toolCalls, toolMessages));
      index = nextIndex;
    } else if (message.role === "tool") {
      index += 1;
    } else {
      result.push(message);
      index += 1;
    }
  }
  return result;
};

const isUnchanged = (left: ChatMessage[], right: ChatMessage[]): boolean =>
  left.length === right.length && left.every((message, index) => message === right[index]);

export const healWorkingHistory = (input: {
  working: ChatMessage[];
  onEvent: (event: QueryEvent) => void;
}): void => {
  const healed = sanitizeHistory(input.working);
  if (isUnchanged(healed, input.working)) {
    return;
  }
  input.onEvent({
    type: "status",
    message: "Repaired malformed tool calls in conversation history.",
  });
  input.working.splice(0, input.working.length, ...healed);
};
