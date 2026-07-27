import type { ChatMessage } from "../types/messages.js";
import type { QueryEvent } from "../types/messages.js";
import type { StreamingDisplayController } from "./useStreamingDisplay.js";
import { createRateLimitedStatusSetter } from "../terminal/rateLimitedStatus.js";
import {
  markToolEnded,
  markToolProgress,
  markToolStarted,
} from "../state/runningTools.js";
import { nextSpinnerMode } from "./spinnerMode.js";
import type { SpinnerMode } from "./spinnerMode.js";

type QueryEventHandlerArgs = {
  appendText: (delta: string) => void;
  appendThinking: (delta: string) => void;
  pushStatus: (status: string) => void;
  setStatusImmediate: (status: string) => void;
  onMessageComplete?: (message: ChatMessage) => void;
  onToolPreview?: (name: string, argsPreview: string) => void;
  onSpinnerMode?: (mode: SpinnerMode) => void;
};

export const createQueryEventHandler = (
  args: QueryEventHandlerArgs,
): ((event: QueryEvent) => void) => {
  const pushStatus = args.pushStatus;
  let spinnerMode: SpinnerMode = "thinking";
  return (event) => {
    const mode = nextSpinnerMode(spinnerMode, event.type);
    if (mode !== spinnerMode) {
      spinnerMode = mode;
      args.onSpinnerMode?.(mode);
    }
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
      markToolStarted(event.name);
      args.onToolPreview?.("", "");
      pushStatus(`running ${event.name}`);
    }
    if (event.type === "tool_end") {
      markToolEnded(event.name);
      pushStatus(event.isError ? `tool error: ${event.name}` : `finished ${event.name}`);
    }
    if (event.type === "tool_call_delta") {
      args.onToolPreview?.(event.name, event.argsPreview);
    }
    if (event.type === "tool_progress") {
      markToolProgress(event.name, event.elapsedMs);
    }
    if (event.type === "usage") {
      pushStatus(`${event.tokensPerSecond.toFixed(1)} tok/s`);
    }
    if (event.type === "preparing") {
      args.setStatusImmediate("");
    }
    if (event.type === "status") {
      args.setStatusImmediate(event.message);
    }
    if (event.type === "error") {
      args.setStatusImmediate(event.message);
    }
    if (event.type === "max_turns_reached") {
      args.setStatusImmediate(`Reached maximum number of turns (${event.maxTurns})`);
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
