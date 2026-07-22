import type { ChatMessage } from "../types/messages.js";
import type { DisplayMessage } from "../types/displayMessages.js";
import { appendStatusMessage } from "../types/displayMessages.js";

export const extractChatMessages = (display: DisplayMessage[]): ChatMessage[] =>
  display.filter((message): message is ChatMessage => message.role !== "status");

export const replaceChatMessages = (
  display: DisplayMessage[],
  chatMessages: ChatMessage[],
): DisplayMessage[] => {
  const chatEntries = extractChatMessages(display);
  const isAppendOnly =
    chatEntries.length <= chatMessages.length &&
    chatEntries.every((message, index) => message === chatMessages[index]);
  if (isAppendOnly) {
    return [...display, ...chatMessages.slice(chatEntries.length)];
  }
  return [...chatMessages];
};

export const appendStatus = (
  display: DisplayMessage[],
  content: string,
  title?: string,
): DisplayMessage[] => appendStatusMessage(display, content, title);

export const clearDisplay = (): DisplayMessage[] => [];
