import { createLlmClient, resolveModel } from "../llm/client.js";
import { toOpenAiMessages } from "../llm/adapters.js";
import { shrinkOversizedToolMessages } from "../../query/toolOutputLimits.js";
import { trimToTokenBudget } from "../../query/contextBudget.js";
import { runHookEvent } from "../hooks/runHooks.js";
import type { Settings } from "../../schemas/settings.js";
import type { ChatMessage } from "../../types/messages.js";
import { getCwd } from "../../utils/cwd.js";

const SUMMARY_INPUT_BUDGET_RATIO = 0.8;

const COMPACT_INSTRUCTION =
  "Summarize the conversation so far for context continuation. Preserve: user goals, decisions made, files touched, tool findings, and unresolved tasks. Be dense and factual. Output only the summary.";

export const compactConversation = async (
  settings: Settings,
  messages: ChatMessage[],
): Promise<ChatMessage[]> => {
  if (messages.length === 0) {
    return messages;
  }
  const preHook = await runHookEvent(settings.hooks ?? {}, {
    event: "PreCompact",
    cwd: getCwd(),
  });
  if (!preHook.allowed) {
    throw new Error(`PreCompact hook blocked compaction: ${preHook.reason}`);
  }
  const client = createLlmClient(settings);
  const resolved = await resolveModel(client, settings.model);
  const budget = Math.floor(resolved.maxContextTokens * SUMMARY_INPUT_BUDGET_RATIO);
  const prepared = trimToTokenBudget(
    sanitizeForSummary(shrinkOversizedToolMessages(messages)),
    budget,
  );
  const response = await client.chat.completions.create({
    model: resolved.modelId,
    messages: [
      ...toOpenAiMessages(prepared),
      { role: "user", content: COMPACT_INSTRUCTION },
    ],
    stream: false,
  });
  const summary = response.choices[0]?.message?.content?.trim();
  if (!summary) {
    throw new Error("Compaction produced empty summary");
  }
  void runHookEvent(settings.hooks ?? {}, {
    event: "PostCompact",
    message: summary,
    cwd: getCwd(),
  });
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
