import type { ChatMessage, ToolCall } from "../types/messages.js";

export const NO_CONTENT_MESSAGE = "(no content)";

export type EmptyTurnLike = {
  message: ChatMessage;
  toolCalls: ToolCall[];
};

export const isEmptyAssistantContent = (text: string): boolean => {
  const trimmed = text.trim();
  return trimmed.length === 0 || trimmed === NO_CONTENT_MESSAGE;
};

export const isEmptyTurn = (turn: EmptyTurnLike): boolean =>
  turn.toolCalls.length === 0 && turn.message.content.trim().length === 0;

export const normalizeEmptyAssistantTurn = <T extends EmptyTurnLike>(turn: T): T => {
  if (!isEmptyTurn(turn)) {
    return turn;
  }
  return {
    ...turn,
    message: {
      ...turn.message,
      content: NO_CONTENT_MESSAGE,
    },
  };
};

export const ensureNonEmptyAssistantContent = (
  messages: ChatMessage[],
): ChatMessage[] => {
  if (messages.length === 0) {
    return messages;
  }
  let changed = false;
  const next = messages.map((message, index) => {
    if (message.role !== "assistant" || index === messages.length - 1) {
      return message;
    }
    if (message.toolCalls && message.toolCalls.length > 0) {
      return message;
    }
    if (message.content.trim().length > 0) {
      return message;
    }
    changed = true;
    return { ...message, content: NO_CONTENT_MESSAGE };
  });
  return changed ? next : messages;
};
