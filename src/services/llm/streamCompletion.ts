import type OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import type { AnyToolDefinition } from "../../Tool.js";
import type { ToolCall } from "../../types/messages.js";
import { readReasoningContent } from "./reasoning.js";
import { mergeToolCalls, toOpenAiTools } from "./adapters.js";

export type StreamChunk =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool_calls"; toolCalls: ToolCall[] }
  | { type: "usage"; promptTokens: number; completionTokens: number; generationMs: number }
  | {
      type: "done";
      content: string;
      toolCalls: ToolCall[];
      finishReason: string | null;
    };

export type StreamCompletionInput = {
  client: OpenAI;
  model: string;
  messages: ChatCompletionMessageParam[];
  tools: AnyToolDefinition[];
  signal?: AbortSignal;
};

export const streamCompletion = async function* (
  input: StreamCompletionInput,
): AsyncGenerator<StreamChunk> {
  const stream = await input.client.chat.completions.create(
    {
      model: input.model,
      messages: input.messages,
      tools: toOpenAiTools(input.tools),
      tool_choice: "auto",
      stream: true,
      stream_options: { include_usage: true },
    },
    { signal: input.signal },
  );

  let content = "";
  let toolCalls: ToolCall[] = [];
  let generationStart: number | null = null;
  let finishReason: string | null = null;

  for await (const chunk of stream) {
    if (chunk.usage) {
      const generationMs = generationStart === null ? 0 : Date.now() - generationStart;
      yield {
        type: "usage",
        promptTokens: chunk.usage.prompt_tokens ?? 0,
        completionTokens: chunk.usage.completion_tokens ?? 0,
        generationMs,
      };
    }

    const choice = chunk.choices[0];
    if (!choice) {
      continue;
    }
    const delta = choice.delta;
    const reasoning = readReasoningContent(delta);
    if (delta.content || delta.tool_calls || reasoning) {
      if (generationStart === null) {
        generationStart = Date.now();
      }
    }
    if (reasoning) {
      yield { type: "reasoning", text: reasoning };
    }
    if (delta.content) {
      content += delta.content;
      yield { type: "text", text: delta.content };
    }
    if (delta.tool_calls) {
      for (const toolDelta of delta.tool_calls) {
        toolCalls = mergeToolCalls(toolCalls, {
          index: toolDelta.index ?? 0,
          id: toolDelta.id,
          name: toolDelta.function?.name,
          arguments: toolDelta.function?.arguments,
        });
      }
      yield { type: "tool_calls", toolCalls: [...toolCalls] };
    }
    if (choice.finish_reason) {
      finishReason = choice.finish_reason;
    }
  }
  yield { type: "done", content, toolCalls, finishReason };
};

export const withRetry = async <T>(
  action: () => Promise<T>,
  attempts: number,
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === attempts - 1) {
        throw error;
      }
      await sleep(500 * (attempt + 1));
    }
  }
  throw lastError;
};

const isRetryable = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return /timeout|ECONNRESET|503|502|500/i.test(error.message);
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
