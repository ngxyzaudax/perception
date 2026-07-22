import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ChatMessage } from "../../types/messages.js";
import { getCwd } from "../../utils/cwd.js";
import { compactToolOutput } from "../../utils/toolDisplay.js";

export const exportConversation = async (
  sessionId: string,
  messages: ChatMessage[],
): Promise<string> => {
  const directory = join(getCwd(), ".perception", "exports");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${sessionId}.md`);
  await writeFile(path, formatConversationMarkdown(messages), "utf8");
  return path;
};

const formatConversationMarkdown = (messages: ChatMessage[]): string =>
  messages.map(formatMessageLine).join("\n\n");

const formatMessageLine = (message: ChatMessage): string => {
  if (message.role === "user") {
    return `you:\n${message.content}`;
  }
  if (message.role === "assistant") {
    return `assistant:\n${message.content}`;
  }
  if (message.role === "tool") {
    const compact = compactToolOutput(message.content, 3);
    return `tool ${message.name}${message.summary ? ` ${message.summary}` : ""}:\n${compact.preview}`;
  }
  return "";
};
