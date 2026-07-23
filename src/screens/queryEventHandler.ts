import type { ChatMessage } from "../types/messages.js";
import type { QueryEvent } from "../types/messages.js";
import type { StreamingDisplayController } from "./useStreamingDisplay.js";
import { createRateLimitedStatusSetter } from "../terminal/rateLimitedStatus.js";

type QueryEventHandlerArgs = {
  appendText: (delta: string) => void;
  appendThinking: (delta: string) => void;
  pushStatus: (status: string) => void;
  setStatusImmediate: (status: string) => void;
  onMessageComplete?: (message: ChatMessage) => void;
};

export const createQueryEventHandler = (
  args: QueryEventHandlerArgs,
): ((event: QueryEvent) => void) => {
  const pushStatus = args.pushStatus;
  return (event) => {
    if (event.type === "text_delta") {
      args.appendText(event.text);
    }
    if (event.type === "reasoning_delta") {
      args.appendThinking(event.text);
    }
    if (event.type === "message_complete") {
      args.onMessageComplete?.(event.message);
    }
    if (event.type === "tool_start") {
      pushStatus(`running ${event.name}`);
    }
    if (event.type === "tool_end") {
      pushStatus(event.isError ? `tool error: ${event.name}` : `finished ${event.name}`);
    }
    if (event.type === "usage") {
      pushStatus(`${event.tokensPerSecond.toFixed(1)} tok/s`);
    }
    if (event.type === "error") {
      args.setStatusImmediate(event.message);
    }
  };
};

export const createQueryStatusSetter = (
  setStatus: (status: string) => void,
): ReturnType<typeof createRateLimitedStatusSetter> => createRateLimitedStatusSetter(setStatus);

export type QueryStreamBindings = {
  appendText: StreamingDisplayController["appendText"];
  appendThinking: StreamingDisplayController["appendThinking"];
  clearStream: StreamingDisplayController["clear"];
};
