import type OpenAI from "openai";
import { toOpenAiMessages } from "../services/llm/adapters.js";
import { streamCompletion, withRetry } from "../services/llm/streamCompletion.js";
import { recordUsage } from "../state/usage.js";
import type { ToolRegistry } from "../Tool.js";
import { listTools } from "../Tool.js";
import type { ChatMessage, QueryEvent, ToolCall } from "../types/messages.js";

export type AssistantTurn = {
  message: ChatMessage;
  toolCalls: ToolCall[];
};

export const collectAssistantTurn = async (input: {
  client: OpenAI;
  model: string;
  messages: ChatMessage[];
  registry: ToolRegistry;
  signal?: AbortSignal;
  onEvent: (event: QueryEvent) => void;
  onToolCalls?: (toolCalls: ToolCall[]) => void;
}): Promise<AssistantTurn> => {
  let content = "";
  let toolCalls: ToolCall[] = [];

  await withRetry(async () => {
    for await (const chunk of streamCompletion({
      client: input.client,
      model: input.model,
      messages: toOpenAiMessages(input.messages),
      tools: listTools(input.registry),
      signal: input.signal,
    })) {
      if (chunk.type === "text") {
        content += chunk.text;
        input.onEvent({ type: "text_delta", text: chunk.text });
      }
      if (chunk.type === "reasoning") {
        input.onEvent({ type: "reasoning_delta", text: chunk.text });
      }
      if (chunk.type === "tool_calls") {
        toolCalls = chunk.toolCalls;
        input.onToolCalls?.(toolCalls);
        emitToolCallDelta(toolCalls, input.onEvent);
      }
      if (chunk.type === "usage") {
        const snapshot = recordUsage({
          promptTokens: chunk.promptTokens,
          completionTokens: chunk.completionTokens,
          generationMs: chunk.generationMs,
        });
        input.onEvent({
          type: "usage",
          promptTokens: chunk.promptTokens,
          completionTokens: chunk.completionTokens,
          tokensPerSecond: snapshot.lastTokensPerSecond,
        });
      }
      if (chunk.type === "done") {
        content = chunk.content;
        toolCalls = chunk.toolCalls;
      }
    }
  }, 3);

  return {
    message: {
      role: "assistant",
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    },
    toolCalls,
  };
};

const PREVIEW_MAX_CHARS = 200;

const emitToolCallDelta = (
  toolCalls: ToolCall[],
  onEvent: (event: QueryEvent) => void,
): void => {
  const current = toolCalls[toolCalls.length - 1];
  if (!current || current.name.length === 0) {
    return;
  }
  onEvent({
    type: "tool_call_delta",
    name: current.name,
    argsPreview: current.arguments.slice(-PREVIEW_MAX_CHARS),
  });
};
