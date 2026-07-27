import type { ChatMessage, QueryEvent } from "../types/messages.js";
import type { QueryResult } from "../query/queryTypes.js";

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

const resultSubtype = (
  result: QueryResult,
): "success" | "error_max_turns" | "error_during_execution" => {
  if (result.reason === "completed") {
    return "success";
  }
  return result.reason === "max_turns" ? "error_max_turns" : "error_during_execution";
};

export const formatJsonResult = (result: QueryResult): string =>
  JSON.stringify({
    type: "result",
    subtype: resultSubtype(result),
    is_error: result.reason !== "completed",
    num_turns: result.turnCount,
    result: finalAssistantText(result.messages),
    messages: result.messages,
    ...(result.reason === "max_turns"
      ? {
          errors: [`Reached maximum number of turns (${result.maxTurns})`],
          max_turns: result.maxTurns,
        }
      : {}),
  });
