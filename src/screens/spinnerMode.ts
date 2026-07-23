import type { QueryEvent } from "../types/messages.js";

export type SpinnerMode = "thinking" | "responding" | "tool-use";

export const nextSpinnerMode = (
  current: SpinnerMode,
  eventType: QueryEvent["type"],
): SpinnerMode => {
  if (eventType === "reasoning_delta") {
    return "thinking";
  }
  if (eventType === "text_delta") {
    return "responding";
  }
  if (eventType === "tool_start" || eventType === "tool_progress" || eventType === "tool_call_delta") {
    return "tool-use";
  }
  if (eventType === "message_complete") {
    return "thinking";
  }
  return current;
};

export const spinnerVerb = (mode: SpinnerMode): string => {
  if (mode === "responding") {
    return "Responding";
  }
  if (mode === "tool-use") {
    return "Running tools";
  }
  return "Thinking";
};
