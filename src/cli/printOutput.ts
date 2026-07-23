import type { ChatMessage, QueryEvent } from "../types/messages.js";

export type PrintOutputFormat = "text" | "json" | "stream-json";

export const parseOutputFormat = (value?: string): PrintOutputFormat => {
  if (value === "json" || value === "stream-json") {
    return value;
  }
  return "text";
};

export const formatEventLine = (event: QueryEvent): string =>
  JSON.stringify(event);

export const finalAssistantText = (messages: ChatMessage[]): string => {
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.content.trim().length > 0);
  return lastAssistant?.content ?? "";
};

export const formatJsonResult = (messages: ChatMessage[]): string =>
  JSON.stringify({
    result: finalAssistantText(messages),
    messages,
  });
