import type { ChatMessage } from "../../types/messages.js";

const CLEARED_TOOL_RESULT = "[Old tool result content cleared]";
const KEEP_RECENT_ASSISTANT_TURNS = 3;

export const microCompactMessages = (messages: ChatMessage[]): ChatMessage[] => {
  const cutIndex = recentAssistantStartIndex(messages, KEEP_RECENT_ASSISTANT_TURNS);
  return messages.map((message, index) => {
    if (index >= cutIndex || message.role !== "tool") {
      return message;
    }
    if (message.content === CLEARED_TOOL_RESULT) {
      return message;
    }
    return { ...message, content: CLEARED_TOOL_RESULT };
  });
};

const recentAssistantStartIndex = (
  messages: ChatMessage[],
  keepTurns: number,
): number => {
  let seen = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role !== "assistant") {
      continue;
    }
    seen += 1;
    if (seen >= keepTurns) {
      return index;
    }
  }
  return 0;
};

export const countClearedToolResults = (
  before: ChatMessage[],
  after: ChatMessage[],
): number =>
  after.reduce((count, message, index) => {
    const previous = before[index];
    if (
      message.role === "tool" &&
      previous?.role === "tool" &&
      previous.content !== CLEARED_TOOL_RESULT &&
      message.content === CLEARED_TOOL_RESULT
    ) {
      return count + 1;
    }
    return count;
  }, 0);
