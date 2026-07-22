import { createLlmClient, resolveModelId } from "../llm/client.js";
import { toOpenAiMessages } from "../llm/adapters.js";
import type { Settings } from "../../schemas/settings.js";
import type { ChatMessage } from "../../types/messages.js";

const COMPACT_INSTRUCTION =
  "Summarize the conversation so far for context continuation. Preserve: user goals, decisions made, files touched, tool findings, and unresolved tasks. Be dense and factual. Output only the summary.";

export const compactConversation = async (
  settings: Settings,
  messages: ChatMessage[],
): Promise<ChatMessage[]> => {
  if (messages.length === 0) {
    return messages;
  }
  const client = createLlmClient(settings);
  const model = await resolveModelId(client, settings.model);
  const response = await client.chat.completions.create({
    model,
    messages: [
      ...toOpenAiMessages(sanitizeForSummary(messages)),
      { role: "user", content: COMPACT_INSTRUCTION },
    ],
    stream: false,
  });
  const summary = response.choices[0]?.message?.content?.trim();
  if (!summary) {
    throw new Error("Compaction produced empty summary");
  }
  return [
    { role: "user", content: `Context summary of the previous conversation:\n${summary}` },
    { role: "assistant", content: "Understood. Continuing from the summarized context." },
  ];
};

const sanitizeForSummary = (messages: ChatMessage[]): ChatMessage[] =>
  messages.map((message) =>
    message.role === "assistant" && message.toolCalls
      ? { role: "assistant", content: describeAssistantToolUse(message) }
      : message,
  );

const describeAssistantToolUse = (
  message: Extract<ChatMessage, { role: "assistant" }>,
): string => {
  const calls = (message.toolCalls ?? [])
    .map((call) => `${call.name}(${call.arguments.slice(0, 200)})`)
    .join(", ");
  return [message.content, calls ? `Tool calls: ${calls}` : ""]
    .filter(Boolean)
    .join("\n");
};
