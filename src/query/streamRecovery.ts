import type OpenAI from "openai";
import { toOpenAiMessages } from "../services/llm/adapters.js";
import { nonStreamingCompletion } from "../services/llm/nonStreamingCompletion.js";
import type { ToolRegistry } from "../Tool.js";
import { listTools } from "../Tool.js";
import type { ChatMessage, QueryEvent, ToolCall } from "../types/messages.js";
import type { AssistantTurn } from "./assistantTurn.js";
import { isEmptyTurn } from "./emptyAssistantTurn.js";

export const maybeRecoverIncompleteStream = async (
  input: {
    client: OpenAI;
    model: string;
    messages: ChatMessage[];
    registry: ToolRegistry;
    signal?: AbortSignal;
    onEvent: (event: QueryEvent) => void;
  },
  streamed: AssistantTurn,
): Promise<AssistantTurn> => {
  if (!isEmptyTurn(streamed) || streamed.finishReason !== null) {
    return streamed;
  }
  input.onEvent({
    type: "status",
    message: "Incomplete stream detected. Retrying request without streaming.",
  });
  try {
    const fallback = await nonStreamingCompletion({
      client: input.client,
      model: input.model,
      messages: toOpenAiMessages(input.messages),
      tools: listTools(input.registry),
      signal: input.signal,
    });
    emitFallbackEvents(fallback, input.onEvent);
    return {
      message: {
        role: "assistant",
        content: fallback.content,
        toolCalls: fallback.toolCalls.length > 0 ? fallback.toolCalls : undefined,
      },
      toolCalls: fallback.toolCalls,
      finishReason: fallback.finishReason,
    };
  } catch (error) {
    if (input.signal?.aborted) {
      throw error;
    }
    input.onEvent({
      type: "status",
      message: "Non-streaming recovery failed. Accepting empty completion.",
    });
    return streamed;
  }
};

const emitFallbackEvents = (
  fallback: { content: string; toolCalls: ToolCall[] },
  onEvent: (event: QueryEvent) => void,
): void => {
  if (fallback.content.length > 0) {
    onEvent({ type: "text_delta", text: fallback.content });
  }
  const lastCall = fallback.toolCalls[fallback.toolCalls.length - 1];
  if (lastCall) {
    onEvent({
      type: "tool_call_delta",
      name: lastCall.name,
      argsPreview: lastCall.arguments.slice(-200),
    });
  }
};
