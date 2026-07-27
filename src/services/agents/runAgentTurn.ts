import { appendFile } from "node:fs/promises";
import { runQuery } from "../../query/queryEngine.js";
import type { ToolRegistry, ToolRuntime } from "../../Tool.js";
import type { AgentDefinition } from "./loadAgents.js";
import type { ChatMessage } from "../../types/messages.js";
import { filterSubAgentRegistry } from "./filterSubAgentRegistry.js";
import type { QueryResult } from "../../query/queryTypes.js";

export type AgentTurnInput = {
  description: string;
  messages: ChatMessage[];
  runtime: ToolRuntime;
  signal: AbortSignal;
  agent?: AgentDefinition;
  systemPromptOverride?: string;
  model?: string;
  maxTurns?: number;
  transcriptPath?: string;
  suppressStream?: boolean;
};

export type AgentTurnResult = QueryResult & {
  text: string;
};

export const runAgentTurn = async (input: AgentTurnInput): Promise<AgentTurnResult> => {
  const registry = filterSubAgentRegistry(input.runtime.registry, input.agent?.tools);
  const settings = input.model
    ? { ...input.runtime.settings, model: input.model }
    : input.agent?.model
      ? { ...input.runtime.settings, model: input.agent.model }
      : input.runtime.settings;

  const result = await runQuery({
    settings,
    registry,
    messages: input.messages,
    permissionContext: input.runtime.permissionContext,
    signal: input.signal,
    systemPromptOverride: input.systemPromptOverride,
    maxTurns: input.maxTurns ?? input.agent?.maxTurns,
    runtimeExtras: {
      sessionId: input.runtime.sessionId,
      hooksConfig: input.runtime.hooksConfig,
      updatePermissionMode: input.runtime.updatePermissionMode,
      requestQuestion: input.runtime.requestQuestion,
      coordinatorMode: input.runtime.coordinatorMode,
      cwd: input.runtime.cwd,
      agentScope: input.runtime.agentScope,
    },
    onEvent: (event) => forwardAgentEvent(input, event),
  });

  const lastAssistant = [...result.messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const text =
    result.reason === "max_turns"
      ? `Reached maximum number of turns (${result.maxTurns})`
      : lastAssistant?.content ?? "Agent produced no response";
  return { ...result, text };
};

const forwardAgentEvent = (
  input: AgentTurnInput,
  event: Parameters<ToolRuntime["onEvent"]>[0],
): void => {
  if (input.suppressStream && (event.type === "text_delta" || event.type === "reasoning_delta")) {
    if (input.transcriptPath && event.type === "text_delta") {
      void appendFile(input.transcriptPath, event.text);
    }
    return;
  }
  if (event.type === "tool_start") {
    input.runtime.onEvent({
      type: "tool_start",
      name: `Agent:${input.description}:${event.name}`,
      input: event.input,
    });
    return;
  }
  if (event.type === "tool_end") {
    input.runtime.onEvent({
      type: "tool_end",
      name: `Agent:${input.description}:${event.name}`,
      output: event.output,
      isError: event.isError,
    });
    return;
  }
  input.runtime.onEvent(event);
};

export { filterSubAgentRegistry };
