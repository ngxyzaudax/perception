import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions.mjs";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { AnyToolDefinition } from "../../Tool.js";
import type { ChatMessage, ToolCall } from "../../types/messages.js";
import {
  ensureNonEmptyAssistantContent,
  NO_CONTENT_MESSAGE,
} from "../../query/emptyAssistantTurn.js";

export const toOpenAiTools = (tools: AnyToolDefinition[]): ChatCompletionTool[] =>
  tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.inputSchema, {
        target: "openApi3",
        $refStrategy: "none",
      }),
    },
  }));

export const toOpenAiMessages = (
  messages: ChatMessage[],
): ChatCompletionMessageParam[] =>
  ensureNonEmptyAssistantContent(messages).flatMap(convertMessage);

const convertMessage = (
  message: ChatMessage,
): ChatCompletionMessageParam[] => {
  if (message.role === "system") {
    return [{ role: "system", content: message.content }];
  }
  if (message.role === "user") {
    return [{ role: "user", content: message.content }];
  }
  if (message.role === "tool") {
    return [
      {
        role: "tool",
        tool_call_id: message.toolCallId,
        content: message.content,
      },
    ];
  }
  const toolCalls = message.toolCalls ?? [];
  const assistantMessage: Extract<ChatCompletionMessageParam, { role: "assistant" }> = {
    role: "assistant",
    content: assistantContentForApi(message.content, toolCalls.length > 0),
  };
  if (toolCalls.length > 0) {
    assistantMessage.tool_calls = toolCalls.map((call) => ({
      id: call.id,
      type: "function",
      function: {
        name: call.name,
        arguments: call.arguments,
      },
    }));
  }
  return [assistantMessage];
};

const assistantContentForApi = (
  content: string,
  hasToolCalls: boolean,
): string | null => {
  if (content.length > 0) {
    return content;
  }
  return hasToolCalls ? null : NO_CONTENT_MESSAGE;
};

export const mergeToolCalls = (
  current: ToolCall[],
  delta: Partial<ToolCall> & { index: number },
): ToolCall[] => {
  const next = [...current];
  const existing = next[delta.index] ?? { id: "", name: "", arguments: "" };
  next[delta.index] = {
    id: delta.id ?? existing.id,
    name: delta.name ?? existing.name,
    arguments: `${existing.arguments}${delta.arguments ?? ""}`,
  };
  return next;
};
