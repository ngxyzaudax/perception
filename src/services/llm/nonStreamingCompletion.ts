import type OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import type { AnyToolDefinition } from "../../Tool.js";
import type { ToolCall } from "../../types/messages.js";
import { toOpenAiTools } from "./adapters.js";

export type NonStreamingCompletion = {
  content: string;
  toolCalls: ToolCall[];
  finishReason: string | null;
};

export const nonStreamingCompletion = async (input: {
  client: OpenAI;
  model: string;
  messages: ChatCompletionMessageParam[];
  tools: AnyToolDefinition[];
  signal?: AbortSignal;
}): Promise<NonStreamingCompletion> => {
  const response = await input.client.chat.completions.create(
    {
      model: input.model,
      messages: input.messages,
      tools: toOpenAiTools(input.tools),
      tool_choice: "auto",
      stream: false,
    },
    { signal: input.signal },
  );
  const choice = response.choices[0];
  const message = choice?.message;
  const toolCalls = (message?.tool_calls ?? []).map((call) => ({
    id: call.id,
    name: call.function.name,
    arguments: call.function.arguments,
  }));
  return {
    content: message?.content ?? "",
    toolCalls,
    finishReason: choice?.finish_reason ?? null,
  };
};
