import type { AnyToolDefinition, ToolRegistry, ToolUseContext } from "../Tool.js";
import { getTool } from "../Tool.js";
import type { PermissionContext } from "../permissions/checkPermission.js";
import {
  formatUserPermissionReject,
  PERMISSION_CANCELLED,
  USER_PERMISSION_DENIED,
} from "../permissions/permissionMessages.js";
import type { Settings } from "../schemas/settings.js";
import type { ChatMessage, QueryEvent, ToolCall } from "../types/messages.js";
import { runHookEvent } from "../services/hooks/runHooks.js";
import type { HooksConfig } from "../services/hooks/hookSchema.js";
import type { QueryRuntimeExtras } from "./queryEngine.js";
import { resolvePermission } from "./resolveToolPermission.js";
import { buildToolContext, buildToolMessage, startProgressTicker } from "./toolCallSupport.js";
import { getCwd } from "../utils/cwd.js";

const ABORTED_TOOL_MESSAGE = "Tool call aborted before completion.";

const isAborted = (signal?: AbortSignal): boolean => signal?.aborted === true;

const abortedToolMessage = (call: ToolCall, name: string): ChatMessage =>
  buildToolMessage(call, ABORTED_TOOL_MESSAGE, name, undefined, undefined, true);

export const executeToolCall = async (input: {
  call: ToolCall;
  registry: ToolRegistry;
  settings: Settings;
  permissionContext: PermissionContext;
  signal?: AbortSignal;
  runtimeExtras?: QueryRuntimeExtras;
  onEvent: (event: QueryEvent) => void;
}): Promise<ChatMessage> => {
  if (isAborted(input.signal)) {
    return abortedToolMessage(input.call, input.call.name);
  }
  const tool = getTool(input.registry, input.call.name);
  if (!tool) {
    return buildToolMessage(input.call, `Unknown tool: ${input.call.name}`, undefined, undefined, undefined, true);
  }
  let parsedInput: unknown;
  try {
    parsedInput = tool.inputSchema.parse(JSON.parse(input.call.arguments || "{}"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid tool input";
    input.onEvent({ type: "tool_end", name: tool.name, output: message, isError: true });
    return buildToolMessage(input.call, message, tool.name, undefined, undefined, true);
  }
  if (isAborted(input.signal)) {
    return abortedToolMessage(input.call, tool.name);
  }
  const summary = tool.summarize(parsedInput);
  const toolContext = buildToolContext(input);
  const hooksConfig = input.runtimeExtras?.hooksConfig ?? input.settings.hooks ?? {};
  const hookCwd = input.runtimeExtras?.cwd ?? getCwd();
  const preHook = await runHookEvent(hooksConfig, {
    event: "PreToolUse",
    toolName: tool.name,
    summary,
    input: parsedInput,
    cwd: hookCwd,
  });
  if (!preHook.allowed) {
    input.onEvent({ type: "tool_end", name: tool.name, output: preHook.reason, isError: true });
    return buildToolMessage(input.call, preHook.reason, tool.name, summary, undefined, true);
  }
  if (isAborted(input.signal)) {
    return abortedToolMessage(input.call, tool.name);
  }
  input.onEvent({ type: "tool_start", name: tool.name, input: parsedInput });
  input.onEvent({ type: "permission_request", toolName: tool.name, summary });
  const permission = await resolvePermission(tool, parsedInput, toolContext, {
    permissionContext: input.permissionContext,
    runtimeExtras: input.runtimeExtras,
    signal: input.signal,
  });
  if (!permission.granted) {
    return deniedToolMessage(input, tool.name, summary, permission.reason);
  }
  if (isAborted(input.signal)) {
    return abortedToolMessage(input.call, tool.name);
  }
  return executeGrantedTool(tool, parsedInput, toolContext, input.call, hooksConfig, hookCwd, input.onEvent, input.signal);
};

const deniedToolMessage = (
  input: {
    call: ToolCall;
    signal?: AbortSignal;
    onEvent: (event: QueryEvent) => void;
  },
  toolName: string,
  summary: string,
  reason: string,
): ChatMessage => {
  if (isAborted(input.signal) || reason === PERMISSION_CANCELLED) {
    input.onEvent({ type: "tool_end", name: toolName, output: ABORTED_TOOL_MESSAGE, isError: true });
    return abortedToolMessage(input.call, toolName);
  }
  const content =
    reason === USER_PERMISSION_DENIED ? formatUserPermissionReject() : reason;
  input.onEvent({ type: "tool_end", name: toolName, output: content, isError: true });
  return buildToolMessage(input.call, content, toolName, summary, undefined, true);
};

const executeGrantedTool = async (
  tool: AnyToolDefinition,
  parsedInput: unknown,
  toolContext: ToolUseContext,
  call: ToolCall,
  hooksConfig: HooksConfig,
  hookCwd: string,
  onEvent: (event: QueryEvent) => void,
  signal?: AbortSignal,
): Promise<ChatMessage> => {
  const summary = tool.summarize(parsedInput);
  const preview = tool.getPreview ? await tool.getPreview(parsedInput, toolContext) : undefined;
  if (isAborted(signal)) {
    return abortedToolMessage(call, tool.name);
  }
  const stopProgress = startProgressTicker(tool.name, onEvent);
  try {
    const output = await tool.call(parsedInput, toolContext);
    const postHook = await runHookEvent(hooksConfig, {
      event: "PostToolUse",
      toolName: tool.name,
      summary,
      input: parsedInput,
      output,
      cwd: hookCwd,
    });
    if (!postHook.allowed) {
      onEvent({ type: "tool_end", name: tool.name, output: postHook.reason, isError: true });
      return buildToolMessage(call, postHook.reason, tool.name, summary, undefined, true);
    }
    const finalOutput = postHook.context
      ? `${output}\n\n[hook context]\n${postHook.context}`
      : output;
    onEvent({ type: "tool_end", name: tool.name, output: finalOutput, isError: false });
    return buildToolMessage(
      call,
      finalOutput,
      tool.name,
      summary,
      preview && !output.startsWith("File has not been read") && !output.startsWith("No match")
        ? {
            kind: "diff",
            oldContent: preview.oldContent,
            newContent: preview.newContent,
            filePath: (parsedInput as { file_path?: string }).file_path,
          }
        : undefined,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "tool execution failed";
    onEvent({ type: "tool_end", name: tool.name, output: message, isError: true });
    return buildToolMessage(call, message, tool.name, summary, undefined, true);
  } finally {
    stopProgress();
  }
};
