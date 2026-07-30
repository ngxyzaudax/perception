import type { ChatMessage, ToolCall } from "../types/messages.js";

export type AssistantTurn = {
  message: ChatMessage;
  toolCalls: ToolCall[];
  finishReason: string | null;
};
