import type { AnyToolDefinition, ToolRegistry } from "../Tool.js";
import { getTool } from "../Tool.js";
import {
  checkToolPermission,
  type PermissionContext,
} from "../permissions/checkPermission.js";
import type { Settings } from "../schemas/settings.js";
import type { ChatMessage, QueryEvent, ToolCall, ToolMessageDisplay } from "../types/messages.js";
import { isPlanFilePath } from "../services/plans/planFiles.js";
import { runHookEvent } from "../services/hooks/runHooks.js";
import type { HooksConfig } from "../services/hooks/hookSchema.js";
import type { QueryRuntimeExtras } from "./queryEngine.js";
import { capToolOutput } from "./toolOutputLimits.js";
import type { ToolUseContext } from "../Tool.js";
import { getCwd } from "../utils/cwd.js";
import { expandPath } from "../utils/path.js";

export const executeToolCall = async (input: {
  call: ToolCall;
  registry: ToolRegistry;
  settings: Settings;
  permissionContext: PermissionContext;
  signal?: AbortSignal;
  runtimeExtras?: QueryRuntimeExtras;
  onEvent: (event: QueryEvent) => void;
}): Promise<ChatMessage> => {
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

  const summary = tool.summarize(parsedInput);
  const toolContext = buildToolContext(input);
  const hooksConfig = input.runtimeExtras?.hooksConfig ?? input.settings.hooks ?? {};
  const hookCwd = resolveToolCwd(input.runtimeExtras);

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

  input.onEvent({ type: "tool_start", name: tool.name, input: parsedInput });
  input.onEvent({ type: "permission_request", toolName: tool.name, summary });

  const granted = await resolvePermission(tool, parsedInput, toolContext, input);
  if (!granted) {
    const denial = "permission denied";
    input.onEvent({ type: "tool_end", name: tool.name, output: denial, isError: true });
    return buildToolMessage(input.call, denial, tool.name, summary, undefined, true);
  }

  return executeGrantedTool(
    tool,
    parsedInput,
    toolContext,
    input.call,
    hooksConfig,
    hookCwd,
    input.onEvent,
  );
};

const resolvePermission = async (
  tool: AnyToolDefinition,
  parsedInput: unknown,
  toolContext: ToolUseContext,
  input: {
    permissionContext: PermissionContext;
    runtimeExtras?: QueryRuntimeExtras;
  },
): Promise<boolean> => {
  if (tool.checkPermissions) {
    const early = await tool.checkPermissions(parsedInput, toolContext);
    if (early?.granted) {
      return true;
    }
  }

  const preview = tool.getPreview ? await tool.getPreview(parsedInput, toolContext) : undefined;
  const planFileEdit = isPlanFileEdit(
    tool.name,
    parsedInput,
    input.runtimeExtras?.sessionId,
    toolContext.cwd,
  );
  const permission = await checkToolPermission(
    { ...input.permissionContext, requestPermission: undefined },
    tool.name,
    tool.summarize(parsedInput),
    tool.isReadOnly(parsedInput),
    { planFileEdit },
  );
  if (permission.granted) {
    return true;
  }
  const response = await input.permissionContext.requestPermission?.({
    toolName: tool.name,
    summary: tool.summarize(parsedInput),
    preview,
  });
  return response?.granted ?? false;
};

const executeGrantedTool = async (
  tool: AnyToolDefinition,
  parsedInput: unknown,
  toolContext: ToolUseContext,
  call: ToolCall,
  hooksConfig: HooksConfig,
  hookCwd: string,
  onEvent: (event: QueryEvent) => void,
): Promise<ChatMessage> => {
  const summary = tool.summarize(parsedInput);
  const preview = tool.getPreview ? await tool.getPreview(parsedInput, toolContext) : undefined;
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
    onEvent({ type: "tool_end", name: tool.name, output, isError: false });
    return buildToolMessage(
      call,
      output,
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
  }
};

const resolveToolCwd = (runtimeExtras?: QueryRuntimeExtras): string =>
  runtimeExtras?.cwd ?? getCwd();

const buildToolContext = (input: {
  signal?: AbortSignal;
  settings: Settings;
  registry: ToolRegistry;
  permissionContext: PermissionContext;
  runtimeExtras?: QueryRuntimeExtras;
  onEvent: (event: QueryEvent) => void;
}): ToolUseContext => ({
  cwd: resolveToolCwd(input.runtimeExtras),
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

const isPlanFileEdit = (
  toolName: string,
  parsedInput: unknown,
  sessionId?: string,
  cwd?: string,
): boolean => {
  if (!sessionId || (toolName !== "Edit" && toolName !== "Write")) {
    return false;
  }
  const filePath = (parsedInput as { file_path?: string }).file_path;
  if (!filePath) {
    return false;
  }
  return isPlanFilePath(expandPath(filePath, cwd), sessionId);
};

const buildToolMessage = (
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
