import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createLlmClient, resolveModel } from "../llm/client.js";
import { toOpenAiMessages } from "../llm/adapters.js";
import { projectMemoryPath } from "../sessions/sessionPaths.js";
import type { Settings } from "../../schemas/settings.js";
import type { ChatMessage } from "../../types/messages.js";

const RECENT_MESSAGE_COUNT = 20;
const MAX_MEMORY_FILE_CHARS = 20000;

const EXTRACTION_INSTRUCTION =
  "Review the conversation above. Extract only durable project facts worth remembering across sessions: build/test commands, code conventions, architecture decisions, and gotchas. Output one fact per line as a markdown bullet. If nothing durable was learned, output exactly: NONE";

export const extractProjectMemory = async (
  settings: Settings,
  messages: ChatMessage[],
): Promise<string | null> => {
  if (!settings.memoryExtraction || messages.length === 0) {
    return null;
  }
  const facts = await requestFacts(settings, messages.slice(-RECENT_MESSAGE_COUNT));
  if (!facts) {
    return null;
  }
  await appendToProjectMemory(facts);
  return facts;
};

const requestFacts = async (
  settings: Settings,
  recent: ChatMessage[],
): Promise<string | null> => {
  try {
    const client = createLlmClient(settings);
    const resolved = await resolveModel(client, settings.model);
    const response = await client.chat.completions.create({
      model: resolved.modelId,
      messages: [
        ...toOpenAiMessages(sanitizeForExtraction(recent)),
        { role: "user", content: EXTRACTION_INSTRUCTION },
      ],
      stream: false,
    });
    const output = response.choices[0]?.message?.content?.trim();
    if (!output || output === "NONE" || output.startsWith("NONE")) {
      return null;
    }
    return output;
  } catch {
    return null;
  }
};

const sanitizeForExtraction = (messages: ChatMessage[]): ChatMessage[] =>
  messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) =>
      message.role === "assistant"
        ? { role: "assistant", content: message.content }
        : message,
    );

const appendToProjectMemory = async (facts: string): Promise<void> => {
  const path = projectMemoryPath();
  await mkdir(dirname(path), { recursive: true });
  const existing = await readFile(path, "utf8").catch(() => "");
  if (existing.length > MAX_MEMORY_FILE_CHARS) {
    return;
  }
  const stamp = new Date().toISOString().slice(0, 10);
  await appendFile(path, `\n<!-- extracted ${stamp} -->\n${facts}\n`, "utf8");
};
