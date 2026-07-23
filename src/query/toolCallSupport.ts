import type { ToolRegistry, ToolUseContext } from "../Tool.js";
import type { PermissionContext } from "../permissions/checkPermission.js";
import type { Settings } from "../schemas/settings.js";
import type { ChatMessage, QueryEvent, ToolCall, ToolMessageDisplay } from "../types/messages.js";
import type { QueryRuntimeExtras } from "./queryEngine.js";
import { capToolOutput } from "./toolOutputLimits.js";
import { getCwd } from "../utils/cwd.js";

const PROGRESS_INTERVAL_MS = 1000;

export const startProgressTicker = (
  name: string,
  onEvent: (event: QueryEvent) => void,
): (() => void) => {
  const startedAt = Date.now();
  const timer = setInterval(() => {
    onEvent({ type: "tool_progress", name, elapsedMs: Date.now() - startedAt });
  }, PROGRESS_INTERVAL_MS);
  timer.unref?.();
  return () => clearInterval(timer);
};

export const buildToolContext = (input: {
  signal?: AbortSignal;
  settings: Settings;
  registry: ToolRegistry;
  permissionContext: PermissionContext;
  runtimeExtras?: QueryRuntimeExtras;
  onEvent: (event: QueryEvent) => void;
}): ToolUseContext => ({
  cwd: input.runtimeExtras?.cwd ?? getCwd(),
  abortSignal: input.signal ?? new AbortController().signal,
  runtime: {
    settings: input.settings,
    registry: input.registry,
    permissionContext: input.permissionContext,
    onEvent: input.onEvent,
    sessionId: input.runtimeExtras?.sessionId,
    hooksConfig: input.runtimeExtras?.hooksConfig ?? input.settings.hooks,
    updatePermissionMode: input.runtimeExtras?.updatePermissionMode,
    requestQuestion: input.runtimeExtras?.requestQuestion,
    coordinatorMode: input.runtimeExtras?.coordinatorMode,
    cwd: input.runtimeExtras?.cwd,
    agentScope: input.runtimeExtras?.agentScope,
  },
});

export const buildToolMessage = (
  call: ToolCall,
  content: string,
  name: string = call.name,
  summary?: string,
  display?: ToolMessageDisplay,
  isError: boolean = false,
): ChatMessage => ({
  role: "tool",
  toolCallId: call.id,
  name,
  content: capToolOutput(content),
  summary,
  display,
  isError,
});
